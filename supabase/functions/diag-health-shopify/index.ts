import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function logEvent(event: any) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    await supabase.from('app_logs').insert({
      user_id: event.userId || null,
      provider: event.provider || 'sys',
      stage: event.stage,
      level: event.level || 'info',
      correlation_id: event.correlationId || null,
      detail: event.detail ? JSON.stringify(event.detail).slice(0, 8000) : null
    });
  } catch (e) {
    // Fail silently
  }
}

async function safeFetch(url: string, init: RequestInit, meta: any) {
  const rid = meta?.correlationId || crypto.randomUUID();
  const started = Date.now();
  
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    
    await logEvent({
      provider: meta.provider,
      stage: meta.stage,
      correlationId: rid,
      detail: {
        url,
        status: res.status,
        duration_ms: Date.now() - started,
        req_headers: init.headers,
        req_body: init.body && String(init.body).slice(0, 2000),
        res_body: text.slice(0, 4000)
      }
    });
    
    return { ok: res.ok, status: res.status, text, rid };
  } catch (error: any) {
    await logEvent({
      provider: meta.provider,
      stage: `${meta.stage}.error`,
      level: 'error',
      correlationId: rid,
      detail: {
        url,
        duration_ms: Date.now() - started,
        error: error.message
      }
    });
    
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const correlationId = crypto.randomUUID();

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
    const userId = url.searchParams.get('userId') || user.id

    // Get user's Shopify install
    const { data: install, error: installError } = await supabaseClient
      .from('cms_installs')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .limit(1)
      .single()

    if (installError || !install) {
      return new Response(JSON.stringify({ 
        ok: false,
        msg: 'No Shopify install found',
        correlationId 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test GraphQL API
    const body = { query: "{ blogs(first:1){ edges{ node{ id title }}} }" };
    const r = await safeFetch(`https://${install.external_id}/admin/api/2025-07/graphql.json`, {
      method: 'POST',
      headers: { 
        'X-Shopify-Access-Token': install.access_token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body)
    }, { 
      provider: 'shopify', 
      stage: 'health.graphql', 
      correlationId 
    });

    const data = r.text ? JSON.parse(r.text) : null;
    const ok = r.ok && !data?.errors;
    
    await logEvent({ 
      userId,
      provider: 'shopify', 
      stage: 'health.result', 
      correlationId, 
      detail: { ok, status: r.status, data }
    });

    return new Response(JSON.stringify({ 
      ok, 
      correlationId, 
      data,
      shop: install.external_id 
    }), {
      status: ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    await logEvent({ 
      provider: 'shopify', 
      stage: 'health.error', 
      level: 'error', 
      correlationId, 
      detail: { message: error?.message }
    });
    
    return new Response(JSON.stringify({ 
      ok: false, 
      correlationId, 
      error: error?.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})