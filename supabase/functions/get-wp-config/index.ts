import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

// Internal server-only function to get WordPress-Supabase secrets from database
export async function getWpSupabaseSecrets() {
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
    console.error('Error fetching WP config:', error);
    throw new Error('Failed to fetch WordPress configuration');
  }

  if (!config) {
    throw new Error('WordPress configuration not found');
  }

  return {
    clientId: config?.wp_supabase_client_id || '',
    clientSecret: config?.wp_supabase_client_secret || ''
  };
}

// This is a helper function that can be called from other edge functions
// It's not meant to be called directly by the frontend
Deno.serve(async (req) => {
  return new Response(JSON.stringify({ 
    error: 'This function is for internal use only' 
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
});