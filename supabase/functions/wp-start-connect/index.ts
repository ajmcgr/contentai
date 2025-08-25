import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'
import { encode as base64urlEncode } from 'https://deno.land/std@0.82.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get WordPress config
    const { data: config, error: configError } = await supabaseServiceRole
      .from('config_integrations')
      .select('wp_client_id, wp_redirect_uri')
      .eq('id', 'global')
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config.wp_client_id || !config.wp_redirect_uri) {
      return new Response(JSON.stringify({ 
        error: 'WordPress OAuth not configured. Please contact admin to configure Client ID and Redirect URI.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate random state (32 bytes base64url)
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = base64urlEncode(stateBytes);

    // Store state with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // Clean up expired states first
    await supabaseServiceRole.rpc('cleanup_expired_oauth_states');
    
    const { error: stateError } = await supabaseServiceRole
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: expiresAt
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return new Response(JSON.stringify({ error: 'Failed to initiate OAuth flow' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate authorization URL
    const authUrl = new URL('https://public-api.wordpress.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', config.wp_client_id);
    authUrl.searchParams.set('redirect_uri', config.wp_redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'global');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({ 
      success: true, 
      authorizeUrl: authUrl.toString() 
    }), {
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