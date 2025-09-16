import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getSecrets() {
  const secrets = {
    SHOPIFY_API_KEY: Deno.env.get('SHOPIFY_API_KEY'),
    SHOPIFY_REDIRECT_URI: Deno.env.get('SHOPIFY_REDIRECT_URI'),
    SHOPIFY_SCOPES: Deno.env.get('SHOPIFY_SCOPES'),
    SHOPIFY_APP_URL: Deno.env.get('SHOPIFY_APP_URL'),
  }
  
  const required = ['SHOPIFY_API_KEY', 'SHOPIFY_REDIRECT_URI', 'SHOPIFY_SCOPES', 'SHOPIFY_APP_URL'] as const
  
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

    const url = new URL(req.url)
    const authHeader = req.headers.get('Authorization')
    let userId = 'unknown-user'

    // Try to get user from auth header if present
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (user && !authError) {
          userId = user.id
        } else {
          console.warn('Shopify OAuth start - invalid auth, using query userId')
          userId = url.searchParams.get('userId') || 'unknown-user'
        }
      } catch (e) {
        console.warn('Auth check failed, using query userId:', e)
        userId = url.searchParams.get('userId') || 'unknown-user'
      }
    } else {
      // No auth header, use query param
      userId = url.searchParams.get('userId') || 'unknown-user'
    }

    const shop = url.searchParams.get('shop')
    
    if (!shop || !shop.endsWith('.myshopify.com')) {
      const appBase = Deno.env.get('SHOPIFY_APP_URL') || Deno.env.get('APP_BASE_URL') || 'https://trycontent.ai';
      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders,
          Location: `${appBase}/dashboard/settings?error=bad_shop`
        }
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
        user_id: userId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

    const secrets = await getSecrets()

    const rid = crypto.randomUUID()
    const redirectHost = new URL(secrets.SHOPIFY_REDIRECT_URI!).host
    const appHost = new URL(secrets.SHOPIFY_APP_URL!).host

    // Log inputs and derived values
    try {
      await supabaseServiceRole.from('app_logs').insert({
        provider: 'shopify',
        stage: 'oauth.start',
        level: 'info',
        correlation_id: rid,
        detail: JSON.stringify({
          userId,
          shop,
          redirect_uri: secrets.SHOPIFY_REDIRECT_URI,
          app_url: secrets.SHOPIFY_APP_URL,
          scopes: secrets.SHOPIFY_SCOPES,
          redirect_host: redirectHost,
          app_host: appHost,
          referer: req.headers.get('referer') || null,
          origin: req.headers.get('origin') || null,
        }).slice(0, 8000)
      })
    } catch (_) { /* ignore logging failures */ }

    // Enforce host match between configured redirect_uri and App URL
    if (redirectHost !== appHost) {
      try {
        await supabaseServiceRole.from('app_logs').insert({
          provider: 'shopify',
          stage: 'oauth.start.host_mismatch',
          level: 'error',
          correlation_id: rid,
          detail: JSON.stringify({ redirectHost, appHost }).slice(0, 8000)
        })
      } catch (_) { /* ignore */ }
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${secrets.SHOPIFY_APP_URL}/dashboard/settings?error=host_mismatch&rid=${rid}`
        }
      })
    }

    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', secrets.SHOPIFY_API_KEY!)
    authUrl.searchParams.set('scope', secrets.SHOPIFY_SCOPES!)
    authUrl.searchParams.set('redirect_uri', secrets.SHOPIFY_REDIRECT_URI!)
    authUrl.searchParams.set('state', state)

    // 302 redirect to Shopify OAuth
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: authUrl.toString()
      }
    })

  } catch (error) {
    console.error('Shopify OAuth start error:', error)
    const appBase = Deno.env.get('SHOPIFY_APP_URL') || Deno.env.get('APP_BASE_URL') || 'https://trycontent.ai';
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${appBase}/dashboard/settings?error=shopify_start_failed`
      }
    })
  }
})