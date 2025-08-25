import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Internal server-only function to get WordPress-Supabase secrets
async function getWpSupabaseSecrets() {
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: config, error } = await supabaseServiceRole
    .from('config_integrations')
    .select('wp_supabase_client_id, wp_supabase_client_secret')
    .eq('id', 'global')
    .maybeSingle();

  if (error) {
    throw new Error('Failed to fetch configuration');
  }

  return {
    clientId: config?.wp_supabase_client_id || '',
    clientSecret: config?.wp_supabase_client_secret || ''
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create service role client for database access
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user session using anon client
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseServiceRole
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get WordPress-Supabase secrets (server-only)
    const { clientId, clientSecret } = await getWpSupabaseSecrets();

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'WordPress-Supabase credentials not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test connection - for now just verify we have both credentials
    // In a real implementation, you might want to make a test API call to WordPress.com
    console.log('Testing WordPress-Supabase connection for user:', user.id);
    
    // Since this is a test configuration, we'll just verify the credentials exist
    // In production, you could make a test OAuth request if there's a suitable endpoint
    
    return new Response(JSON.stringify({
      success: true,
      message: 'WordPress-Supabase credentials are configured and ready for use',
      hasCredentials: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Connection test error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Connection test failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});