import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    "SHOPIFY_APP_URL"
  ];
  for (const k of required) {
    if (!map[k]) throw new Error(`Missing Shopify secret: ${k}`);
  }

  return {
    apiKey: map.SHOPIFY_API_KEY,
    apiSecret: map.SHOPIFY_API_SECRET,
    appUrl: map.SHOPIFY_APP_URL
  };
}

async function verifyHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, signature, ...otherParams } = params
  const message = Object.keys(otherParams)
    .sort()
    .map(key => `${key}=${otherParams[key]}`)
    .join('&')
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature_bytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const digest = Array.from(new Uint8Array(signature_bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return digest === hmac
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop')
    const state = url.searchParams.get('state')
    const hmac = url.searchParams.get('hmac')
    const code = url.searchParams.get('code')

    if (!shop || !state || !hmac || !code) {
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Verify state
    const { data: stateRecord, error: stateError } = await supabaseServiceRole
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single()

    if (stateError || !stateRecord) {
      return new Response('Invalid state', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    if (new Date(stateRecord.expires_at) < new Date()) {
      return new Response('Expired state', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Verify HMAC
    const { apiKey, apiSecret, appUrl } = await getShopifySecrets()
    const params = Object.fromEntries(url.searchParams.entries())
    
    const isValidHmac = await verifyHmac(params, apiSecret)
    if (!isValidHmac) {
      return new Response('Invalid HMAC', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Shopify token exchange failed:', tokenData)
      return new Response('Token exchange failed', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Store the install
    const { error: insertError } = await supabaseServiceRole
      .from('cms_installs')
      .upsert({
        user_id: stateRecord.user_id,
        provider: 'shopify',
        external_id: shop,
        access_token: tokenData.access_token,
        scope: tokenData.scope
      }, {
        onConflict: 'user_id,provider,external_id'
      })

    if (insertError) {
      console.error('Failed to store install:', insertError)
      // Do not block the flow for Shopify review – continue to redirect
    }

    // Register mandatory GDPR + uninstall webhooks (idempotent)
    try {
      const webhookAddress = 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-webhooks'
      const topics = ['customers/data_request','customers/redact','shop/redact','app/uninstalled']
      for (const topic of topics) {
        try {
          await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': tokenData.access_token
            },
            body: JSON.stringify({ webhook: { topic, address: webhookAddress, format: 'json' } })
          })
        } catch (e) {
          console.error('Webhook registration failed for topic', topic, e)
        }
      }
    } catch (e) {
      console.error('Webhook registration batch failed:', e)
    }

    // Clean up state
    await supabaseServiceRole
      .from('oauth_states')
      .delete()
      .eq('state', state)

    // Log success to app_logs
    await supabaseServiceRole.from('app_logs').insert({
      provider: 'shopify',
      stage: 'oauth.callback.success',
      user_id: stateRecord.user_id,
      detail: JSON.stringify({ shop })
    });
 
    console.log('Shopify installation successful for user:', stateRecord.user_id, 'shop:', shop)
 
    // Redirect to app UI as required by Shopify (embedded App URL)
    const redirectTo = `${appUrl}?shop=${encodeURIComponent(shop)}&installed=true`
    
    // Create an HTML response that immediately redirects to the embedded app UI
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${redirectTo}">
        <title>Redirecting to App...</title>
      </head>
      <body>
        <p>Installation complete! Redirecting to your app...</p>
        <script>
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = "${redirectTo}";
            } else {
              window.location.href = "${redirectTo}";
            }
          } catch (e) {
            window.location.href = "${redirectTo}";
          }
        </script>
      </body>
      </html>
    `;
    
    return new Response(redirectHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    try {
      const supabaseServiceRole = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseServiceRole.from('app_logs').insert({
        provider: 'shopify',
        stage: 'oauth.callback.error',
        level: 'error',
        detail: String(error && (error as any).message || error)
      });
    } catch (_) {}
    const appBase = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('') || 'https://id-preview--0d84bc4c-60bd-4402-8799-74365f8b638e.lovable.app';
    return new Response(null, { 
      status: 302, 
      headers: {
        ...corsHeaders,
        Location: `${appBase}/integrations?error=shopify_failed`
      }
    })
  }
})