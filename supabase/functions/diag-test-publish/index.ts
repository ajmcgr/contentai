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

async function shopifyCreateArticle({ shop, access_token, blogId, title, html, correlationId }: any) {
  const mutation = `
    mutation CreateArticle($input: ArticleInput!) {
      articleCreate(article: $input) {
        article { id title handle publishedAt }
        userErrors { field message }
      }
    }`;
  
  const input = { 
    blogId, 
    title, 
    bodyHtml: html,
    isPublished: true 
  };
  
  const r = await safeFetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 
      'X-Shopify-Access-Token': access_token, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ query: mutation, variables: { input } })
  }, { 
    provider: 'shopify', 
    stage: 'diag.publish', 
    correlationId 
  });

  const data = JSON.parse(r.text);
  if (!r.ok || data.errors || data.data?.articleCreate?.userErrors?.length) {
    throw new Error(`Shopify publish error: ${JSON.stringify(data)}`);
  }
  
  return data.data.articleCreate.article;
}

async function wixCreateDraft({ access_token, title, memberId, richContent, tags, correlationId }: any) {
  const r = await safeFetch('https://www.wixapis.com/blog/v3/draft-posts', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${access_token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      draftPost: { title, memberId, tags, richContent }
    })
  }, { 
    provider: 'wix', 
    stage: 'diag.draft', 
    correlationId 
  });

  const data = JSON.parse(r.text);
  if (!r.ok) {
    throw new Error(`Wix draft error: ${JSON.stringify(data)}`);
  }
  
  return data.draftPost;
}

async function wixPublishDraft({ access_token, draftPostId, correlationId }: any) {
  const r = await safeFetch(`https://www.wixapis.com/blog/v3/draft-posts/${draftPostId}/publish`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${access_token}` 
    }
  }, { 
    provider: 'wix', 
    stage: 'diag.publish', 
    correlationId 
  });

  const data = JSON.parse(r.text);
  if (!r.ok) {
    throw new Error(`Wix publish error: ${JSON.stringify(data)}`);
  }
  
  return data.post;
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
    const provider = url.searchParams.get('provider')

    if (!['shopify', 'wix'].includes(provider || '')) {
      return new Response(JSON.stringify({
        ok: false,
        msg: 'Invalid provider',
        correlationId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user's install for the provider
    const { data: install, error: installError } = await supabaseClient
      .from('cms_installs')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .limit(1)
      .single()

    if (installError || !install) {
      return new Response(JSON.stringify({ 
        ok: false,
        msg: `No ${provider} install found`,
        correlationId 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let result: any;
    const timestamp = new Date().toISOString();

    if (provider === 'shopify') {
      // Discover blogId if missing
      const q = `{ blogs(first:1){ edges{ node{ id title }}} }`;
      const gql = await safeFetch(`https://${install.external_id}/admin/api/2025-07/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': install.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: q })
      }, { 
        provider: 'shopify', 
        stage: 'diag.discoverBlog', 
        correlationId 
      });

      const data = JSON.parse(gql.text);
      const blogId = data?.data?.blogs?.edges?.[0]?.node?.id;
      
      if (!blogId) {
        throw new Error('No blog found on store');
      }

      result = await shopifyCreateArticle({
        shop: install.external_id,
        access_token: install.access_token,
        blogId,
        title: `[DIAG] Test Post ${timestamp}`,
        html: `<p>Diagnostics OK at ${timestamp}</p>`,
        correlationId
      });
    } else {
      // Wix
      const extra = install.extra || {};
      if (!extra.memberId) {
        throw new Error('Missing Wix memberId in install.extra');
      }

      const draft = await wixCreateDraft({
        access_token: install.access_token,
        title: `[DIAG] Test ${timestamp}`,
        memberId: extra.memberId,
        tags: ['diag'],
        richContent: {
          nodes: [{
            type: 'PARAGRAPH',
            nodes: [{
              type: 'TEXT',
              text: 'Diagnostics OK'
            }]
          }]
        },
        correlationId
      });

      result = await wixPublishDraft({
        access_token: install.access_token,
        draftPostId: draft.id,
        correlationId
      });
    }

    await logEvent({ 
      userId,
      provider: provider as any, 
      stage: 'diag.testPublish.success', 
      correlationId, 
      detail: result 
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      correlationId, 
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    await logEvent({ 
      provider: 'sys', 
      stage: 'diag.testPublish.error', 
      level: 'error', 
      correlationId, 
      detail: { message: error?.message, stack: error?.stack }
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