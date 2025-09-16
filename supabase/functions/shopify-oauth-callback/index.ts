import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getSecrets() {
  const secrets = {
    SHOPIFY_API_KEY: Deno.env.get('SHOPIFY_API_KEY'),
    SHOPIFY_API_SECRET: Deno.env.get('SHOPIFY_API_SECRET')
  }
  
  const required = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET']
  
  for (const key of required) {
    if (!secrets[key]) {
      throw new Error(`Missing secret: ${key}`)
    }
  }
  
  return secrets
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
    const secrets = await getSecrets()
    const params = Object.fromEntries(url.searchParams.entries())
    
    const isValidHmac = await verifyHmac(params, secrets.SHOPIFY_API_SECRET)
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
        client_id: secrets.SHOPIFY_API_KEY,
        client_secret: secrets.SHOPIFY_API_SECRET,
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
      return new Response('Failed to store installation', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Clean up state
    await supabaseServiceRole
      .from('oauth_states')
      .delete()
      .eq('state', state)

    console.log('Shopify installation successful for user:', stateRecord.user_id, 'shop:', shop)

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopify Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Shopify Connected Successfully</h1>
          <p>Your Shopify store "${shop}" has been connected.</p>
          <p>You can now close this window and return to the application.</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'shopify_connected', shop: '${shop}' }, '*');
                window.close();
              } else {
                window.location.href = '/settings?connected=shopify';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Connection Failed</h1>
          <p>There was an error connecting your Shopify store.</p>
          <p>Please try again or contact support if the problem persists.</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'shopify_error' }, '*');
                window.close();
              } else {
                window.location.href = '/settings?error=shopify_failed';
              }
            }, 3000);
          </script>
        </body>
      </html>
    `, { 
      status: 500, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })
  }
})