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

    // Get user's Shopify install
    const { data: install, error: installError } = await supabaseClient
      .from('cms_installs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'shopify')
      .limit(1)
      .single()

    if (installError || !install) {
      return new Response(JSON.stringify({ 
        error: 'No Shopify installation found' 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test the connection by querying blogs
    const query = `{
      blogs(first: 5) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }`

    const response = await fetch(`https://${install.external_id}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': install.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    const data = await response.json()
    
    if (!response.ok || data.errors) {
      console.error('Shopify health check failed:', data)
      return new Response(JSON.stringify({
        ok: false,
        error: 'Connection test failed',
        details: data.errors || data
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const blogs = data.data.blogs.edges.map((edge: any) => edge.node)

    return new Response(JSON.stringify({
      ok: true,
      shop: install.external_id,
      scope: install.scope,
      blogs,
      connectedAt: install.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Shopify health check error:', error)
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