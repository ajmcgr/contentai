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
  const required = ['WIX_CLIENT_ID', 'WIX_CLIENT_SECRET', 'WIX_REDIRECT_URI']
  
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
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const state = url.searchParams.get('state')
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(`OAuth error: ${error}`, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    if (!state || !code) {
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

    // Exchange code for access token
    const secrets = await getSecrets()
    
    const tokenResponse = await fetch('https://www.wix.com/oauth/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: secrets.WIX_CLIENT_ID,
        client_secret: secrets.WIX_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: secrets.WIX_REDIRECT_URI
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Wix token exchange failed:', tokenData)
      return new Response('Token exchange failed', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Get site info using the access token
    let siteId = 'unknown'
    try {
      const siteResponse = await fetch('https://www.wixapis.com/site-list/v2/sites', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      })
      const siteData = await siteResponse.json()
      if (siteResponse.ok && siteData.sites && siteData.sites.length > 0) {
        siteId = siteData.sites[0].id
      }
    } catch (e) {
      console.warn('Could not fetch site ID:', e)
    }

    // Store the install
    const { error: insertError } = await supabaseServiceRole
      .from('cms_installs')
      .upsert({
        user_id: stateRecord.user_id,
        provider: 'wix',
        external_id: siteId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        extra: { site_id: siteId }
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

    console.log('Wix installation successful for user:', stateRecord.user_id, 'site:', siteId)

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wix Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Wix Connected Successfully</h1>
          <p>Your Wix site has been connected.</p>
          <p>You can now close this window and return to the application.</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'wix_connected', siteId: '${siteId}' }, '*');
                window.close();
              } else {
                window.location.href = '/nuclear-connect?wix=connected';
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
    console.error('Wix OAuth callback error:', error)
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
          <p>There was an error connecting your Wix site.</p>
          <p>Please try again or contact support if the problem persists.</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'wix_error' }, '*');
                window.close();
              } else {
                window.location.href = '/nuclear-connect?error=wix_failed';
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