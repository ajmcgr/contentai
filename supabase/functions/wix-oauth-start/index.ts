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
  const required = ['WIX_CLIENT_ID', 'WIX_REDIRECT_URI']
  
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
          console.warn('Wix OAuth start - invalid auth, using query userId')
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
    
    const authUrl = new URL('https://www.wix.com/oauth/authorize')
    authUrl.searchParams.set('client_id', secrets.WIX_CLIENT_ID)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'offline_access')
    authUrl.searchParams.set('redirect_uri', secrets.WIX_REDIRECT_URI)
    authUrl.searchParams.set('state', state)

    // Return a redirect response instead of JSON
    return new Response(`
      <!DOCTYPE html>
      <html><head><title>Redirecting...</title></head>
      <body><script>window.location.href = '${authUrl.toString()}';</script></body>
      </html>
    `, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })

  } catch (error) {
    console.error('Wix OAuth start error:', error)
    return new Response(`
      <!DOCTYPE html>
      <html><head><title>Error</title></head>
      <body><script>window.location.href = '/nuclear-connect?err=wix_start_failed';</script></body>
      </html>
    `, { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })
  }
})