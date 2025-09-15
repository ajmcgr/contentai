import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Get user's Wix install
    const { data: install, error: installError } = await supabaseClient
      .from('cms_installs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'wix')
      .limit(1)
      .single()

    if (installError || !install) {
      return new Response(JSON.stringify({ 
        error: 'No Wix installation found' 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test the connection by querying blog posts
    const response = await fetch('https://www.wixapis.com/blog/v3/posts?limit=1', {
      headers: {
        'Authorization': `Bearer ${install.access_token}`
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Wix health check failed:', data)
      
      // If 401, might need token refresh
      if (response.status === 401) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Token expired',
          needsRefresh: true
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        ok: false,
        error: 'Connection test failed',
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      siteId: install.external_id,
      scope: install.scope,
      postsCount: data.posts?.length ?? 0,
      connectedAt: install.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Wix health check error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: 'Health check failed',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})