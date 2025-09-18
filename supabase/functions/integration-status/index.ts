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
      return new Response(JSON.stringify({ ok: false, msg: 'Missing authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, msg: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check cms_installs for legacy connections
    const { data, error } = await supabaseClient
      .from('cms_installs')
      .select('provider, external_id, scope, updated_at, extra')
      .eq('user_id', user.id)

    if (error) throw error

    // Check wix_connections for new Wix OAuth connections
    const { data: wixConnections, error: wixError } = await supabaseClient
      .from('wix_connections')
      .select('instance_id, created_at, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (wixError) throw wixError

    const byProvider: any = { shopify: null, wix: null }
    for (const row of (data || [])) {
      byProvider[row.provider] = row
    }

      // Add Wix connection from wix_connections table if exists
      if (wixConnections && wixConnections.length > 0) {
        const wixConn = wixConnections[0]
        byProvider.wix = {
          provider: 'wix',
          external_id: wixConn.instance_id || 'wix-default',
          updated_at: wixConn.created_at,
          extra: { expires_at: wixConn.expires_at }
        }
      }

    return new Response(JSON.stringify({ 
      ok: true, 
      installs: byProvider 
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error: any) {
    console.error('Integration status error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      msg: error?.message || 'status error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})