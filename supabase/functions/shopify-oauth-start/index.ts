import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getSecrets() {
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data, error } = await supabaseServiceRole
    .from('app_secrets')
    .select('key, value')
    .eq('namespace', 'cms_integrations')
  
  if (error) throw error
  
  const secrets = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const required = ['SHOPIFY_API_KEY', 'SHOPIFY_REDIRECT_URI', 'SHOPIFY_SCOPES']
  
  for (const key of required) {
    if (!secrets[key]) {
      throw new Error(`Missing secret: ${key}`)
    }
  }
  
  return secrets
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

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop')
    
    if (!shop || !shop.endsWith('.myshopify.com')) {
      return new Response('Invalid shop domain', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Generate random state
    const state = crypto.randomUUID()
    
    // Store state temporarily (expires in 10 minutes)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseServiceRole
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

    const secrets = await getSecrets()
    
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', secrets.SHOPIFY_API_KEY)
    authUrl.searchParams.set('scope', secrets.SHOPIFY_SCOPES)
    authUrl.searchParams.set('redirect_uri', secrets.SHOPIFY_REDIRECT_URI)
    authUrl.searchParams.set('state', state)

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      state 
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Shopify OAuth start error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})