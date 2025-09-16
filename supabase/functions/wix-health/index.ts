import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, msg: 'Missing authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, msg: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the Wix installation for this user
    const { data: install, error: installError } = await supabaseClient
      .from('cms_installs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'wix')
      .single();

    if (installError || !install) {
      return new Response(JSON.stringify({ 
        ok: false, 
        msg: 'No Wix installation found',
        connected: false
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test the connection by making a simple API call
    const testResponse = await fetch('https://www.wixapis.com/blog/v3/posts?limit=1', {
      headers: { 
        'Authorization': `Bearer ${install.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return new Response(JSON.stringify({ 
        ok: false, 
        msg: 'Wix API test failed',
        connected: false,
        error: errorText,
        status: testResponse.status
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const testData = await testResponse.json();
    
    return new Response(JSON.stringify({ 
      ok: true, 
      msg: 'Wix integration is healthy',
      connected: true,
      site_id: install.external_id,
      posts_count: testData?.posts?.length || 0,
      scope: install.scope || 'blog access'
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Wix health check error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      msg: error?.message || 'Health check failed',
      connected: false 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});