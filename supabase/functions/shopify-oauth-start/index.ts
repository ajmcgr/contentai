import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function host(u: string) { 
  const x = new URL(u); 
  return x.protocol + '//' + x.host.toLowerCase(); 
}

function topRedirectHtml(url: string) {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecting to Shopify...</title>
    </head>
    <body>
      <p>Redirecting to Shopify authorization...</p>
      <script>
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = "${url}";
          } else {
            window.location.href = "${url}";
          }
        } catch (e) {
          window.location.href = "${url}";
        }
      </script>
    </body>
    </html>
  `, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html'
    }
  });
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

    const { SHOPIFY_API_KEY, SHOPIFY_REDIRECT_URI, SHOPIFY_APP_URL, SHOPIFY_SCOPES } = await getSecrets()
    const hRedirect = host(SHOPIFY_REDIRECT_URI.trim())
    const hApp = host(SHOPIFY_APP_URL.trim())

    console.log('[shopify-start] client_id=%s redirect=%s appUrl=%s', SHOPIFY_API_KEY, hRedirect, hApp)

    if (hRedirect !== hApp) {
      console.error('[shopify-start] host-mismatch', { hRedirect, hApp })
      return new Response(
        `Host mismatch: redirect=${hRedirect} app=${hApp}. Fix App URL to match redirect host or vice versa.`,
        { status: 400, headers: corsHeaders }
      )
    }

    // Build authorize URL using *the same* SHOPIFY_REDIRECT_URI
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', SHOPIFY_API_KEY)
    authUrl.searchParams.set('scope', SHOPIFY_SCOPES)
    authUrl.searchParams.set('redirect_uri', SHOPIFY_REDIRECT_URI.trim())
    authUrl.searchParams.set('state', state)

    // IMPORTANT: return iframe-safe top redirect (not a plain 302)
    return topRedirectHtml(authUrl.toString())

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