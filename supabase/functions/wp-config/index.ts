import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseServiceRole
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Get WordPress config
      const { data: config, error } = await supabaseServiceRole
        .from('config_integrations')
        .select('wp_client_id, wp_client_secret, wp_redirect_uri, updated_at, updated_by_user_id')
        .eq('id', 'global')
        .maybeSingle();

      if (error) {
        console.error('Error fetching config:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        hasClientId: !!(config?.wp_client_id),
        hasClientSecret: !!(config?.wp_client_secret),
        clientId: config?.wp_client_id || '',
        redirectUri: config?.wp_redirect_uri || '',
        updatedAt: config?.updated_at,
        updatedByUserId: config?.updated_by_user_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Set WordPress config
      const { clientId, clientSecret } = await req.json();

      if (!clientId) {
        return new Response(JSON.stringify({ error: 'Client ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: any = {
        wp_client_id: clientId,
        updated_by_user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Only update secret if provided
      if (clientSecret && clientSecret.trim()) {
        updateData.wp_client_secret = clientSecret.trim();
      }

      const { error } = await supabaseServiceRole
        .from('config_integrations')
        .upsert(updateData, { onConflict: 'id' });

      if (error) {
        console.error('Error updating config:', error);
        return new Response(JSON.stringify({ error: 'Failed to update configuration' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});