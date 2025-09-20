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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="0;url=${url}">
      <title>Redirecting to Shopify...</title>
    </head>
    <body>
      <p>Redirecting to Shopify authorization... If not redirected, <a href="${url}" target="_top" rel="noopener noreferrer">click here</a>.</p>
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
  `;
  return new Response(html, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
      'Location': url,
      'Referrer-Policy': 'no-referrer'
    }
  });
}

async function getShopifySecrets() {
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseServiceRole
    .from("app_secrets")
    .select("key,value")
    .eq("namespace", "cms_integrations");

  if (error) throw new Error("Failed to fetch Shopify secrets: " + error.message);

  const map = Object.fromEntries((data || []).map(r => [r.key, String(r.value).trim()]));

  const required = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET", 
    "SHOPIFY_APP_URL",
    "SHOPIFY_REDIRECT_URI",
    "SHOPIFY_SCOPES"
  ];
  for (const k of required) {
    if (!map[k]) throw new Error(`Missing Shopify secret: ${k}`);
  }

  return {
    apiKey: map.SHOPIFY_API_KEY,
    apiSecret: map.SHOPIFY_API_SECRET,
    appUrl: map.SHOPIFY_APP_URL,
    redirectUri: map.SHOPIFY_REDIRECT_URI,
    scopes: map.SHOPIFY_SCOPES
  };
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
      const appBase = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('') || 'https://id-preview--0d84bc4c-60bd-4402-8799-74365f8b638e.lovable.app';
      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders,
          Location: `${appBase}/integrations?error=bad_shop`
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

    // Log start of OAuth for visibility
    try {
      await supabaseServiceRole.from('app_logs').insert({
        provider: 'shopify',
        stage: 'oauth.start',
        user_id: userId,
        detail: JSON.stringify({ shop, state })
      });
    } catch (_) {}

    const { apiKey, apiSecret, appUrl, redirectUri, scopes } = await getShopifySecrets()
    const hRedirect = host(redirectUri)
    const hApp = host(appUrl)

    console.log('[shopify-start] client_id=%s redirect=%s appUrl=%s', apiKey, hRedirect, hApp)

    if (hRedirect !== hApp) {
      console.error('[shopify-start] host-mismatch', { hRedirect, hApp })
      return new Response(
        `Host mismatch: redirect=${hRedirect} app=${hApp}. Fix App URL to match redirect host or vice versa.`,
        { status: 400, headers: corsHeaders }
      )
    }

    // Build authorize URL using *the same* redirect URI
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', apiKey)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    // IMPORTANT: return iframe-safe top redirect (not a plain 302)
    return topRedirectHtml(authUrl.toString())

  } catch (error) {
    console.error('Shopify OAuth start error:', error)
    // Attempt to log error to app_logs
    try {
      const supabaseServiceRole = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseServiceRole.from('app_logs').insert({
        provider: 'shopify',
        stage: 'oauth.start.error',
        level: 'error',
        detail: String((error as any)?.message || error)
      });
    } catch (_) {}
    const appBase = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('') || 'https://id-preview--0d84bc4c-60bd-4402-8799-74365f8b638e.lovable.app';
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${appBase}/integrations?error=shopify_start_failed`
      }
    })
  }
})