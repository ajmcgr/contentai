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

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'content-ai-2.myshopify.com'

    // Use service role for comprehensive data access
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check for existing installation
    const { data: install, error: installError } = await supabaseServiceRole
      .from('cms_installs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'shopify')
      .eq('external_id', shop)
      .maybeSingle()

    // Check OAuth states
    const { data: oauthStates, error: statesError } = await supabaseServiceRole
      .from('oauth_states')
      .select('*')
      .eq('user_id', user.id)
      .order('expires_at', { ascending: false })
      .limit(5)

    // Check recent logs
    const { data: logs, error: logsError } = await supabaseServiceRole
      .from('app_logs')
      .select('*')
      .or(`user_id.eq.${user.id},provider.eq.shopify`)
      .order('created_at', { ascending: false })
      .limit(10)

    const debugInfo = {
      user_id: user.id,
      shop,
      timestamp: new Date().toISOString(),
      
      // Installation status
      installation: {
        exists: !!install,
        details: install || null,
        error: installError?.message || null
      },
      
      // OAuth states
      oauth_states: {
        count: oauthStates?.length || 0,
        states: oauthStates || [],
        error: statesError?.message || null
      },
      
      // Recent logs
      logs: {
        count: logs?.length || 0,
        entries: logs || [],
        error: logsError?.message || null
      },
      
      // Environment check
      environment: {
        supabase_url: Deno.env.get('SUPABASE_URL')?.substring(0, 30) + '...',
        has_service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      }
    }

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Shopify debug error:', error)
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})