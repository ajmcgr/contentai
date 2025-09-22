import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request body
type PublishBody = {
  userId: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  tags?: string[];
  categoryIds?: string[];
  memberId?: string;
  wixSiteId?: string;
  plainText?: string;
};

function J(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

// Convert HTML to Wix Rich Content format
function htmlToRichContent(htmlContent: string, title: string) {
  const safeTitle = (title || 'Untitled').slice(0, 200);
  let content = (htmlContent || '').slice(0, 40000);
  
  // Basic HTML to Rich Content conversion
  const nodes: any[] = [];
  
  // Add title as first heading
  nodes.push({
    type: 'HEADING',
    headingData: { level: 1 },
    nodes: [
      { type: 'TEXT', textData: { text: safeTitle, decorations: [] } },
    ],
  });
  
  // Parse HTML content into Rich Content nodes
  const htmlLines = content.split(/\n+/).filter(line => line.trim());
  
  for (const line of htmlLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Handle headings
    if (trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h[1-6]>$/i)) {
      const match = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h[1-6]>$/i);
      const level = parseInt(match![1]);
      const text = stripHtml(match![2]).trim();
      if (text) {
        nodes.push({
          type: 'HEADING',
          headingData: { level: Math.min(level + 1, 6) }, // Offset by 1 since title is H1
          nodes: [
            { type: 'TEXT', textData: { text, decorations: [] } },
          ],
        });
      }
      continue;
    }
    
    // Handle lists
    if (trimmed.match(/^<(ul|ol)[^>]*>/i) || trimmed.includes('<li>')) {
      const listItems = trimmed.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      if (listItems.length > 0) {
        const isOrdered = trimmed.includes('<ol');
        for (const item of listItems) {
          const text = stripHtml(item).trim();
          if (text) {
            nodes.push({
              type: 'BULLETED_LIST',
              bulletedListData: {
                value: isOrdered ? 'NUMBERED' : 'BULLET'
              },
              nodes: [
                { type: 'TEXT', textData: { text, decorations: [] } },
              ],
            });
          }
        }
      }
      continue;
    }
    
    // Handle paragraphs and other content
    const text = stripHtml(trimmed).trim();
    if (text) {
      // Split long paragraphs
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const paragraph = sentences.join(' ');
      
      if (paragraph) {
        nodes.push({
          type: 'PARAGRAPH',
          nodes: [
            { type: 'TEXT', textData: { text: paragraph, decorations: [] } },
          ],
        });
      }
    }
  }
  
  // Fallback if no content was parsed
  if (nodes.length <= 1) {
    const plainText = stripHtml(content).trim() || 'Content could not be formatted.';
    nodes.push({
      type: 'PARAGRAPH',
      nodes: [
        { type: 'TEXT', textData: { text: plainText, decorations: [] } },
      ],
    });
  }
  
  return {
    nodes,
    metadata: { version: 1 },
    documentStyle: {},
  } as const;
}

function stripHtml(html: string) {
  try { 
    return (html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(); 
  } catch { 
    return ''; 
  }
}

async function resolveValidMemberId(headers: Record<string, string>, candidate?: string | null) {
  // If we have a candidate, verify it exists
  if (candidate) {
    try {
      const r = await fetch(`https://www.wixapis.com/members/v1/members/${encodeURIComponent(candidate)}`, { headers });
      if (r.ok) return candidate;
    } catch {}
  }
  
  // Try different approaches to find members
  const attempts = [
    // 1. Full member list with different filters
    () => fetch('https://www.wixapis.com/members/v1/members?limit=50&fieldsets=FULL', { headers }),
    // 2. Try with minimal query
    () => fetch('https://www.wixapis.com/members/v1/members?limit=50', { headers }),
    // 3. Try approved members only
    () => fetch('https://www.wixapis.com/members/v1/members?limit=50&fieldsets=FULL&filter={"status":"APPROVED"}', { headers }),
    // 4. Current user as member (if site owner is also a member)
    () => fetch('https://www.wixapis.com/oauth2/token-info', { 
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: headers.authorization?.replace('Bearer ', '') })
    }),
  ];

  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      
      const data: any = await res.json().catch(() => ({}));
      
      // For member list responses
      if (data?.members?.length > 0) {
        const member = data.members.find((m: any) => m.status === 'APPROVED') || data.members[0];
        if (member?.id) return member.id;
      }
      
      // For token info response - try to use the token owner as member
      if (data?.userId) {
        try {
          const userCheck = await fetch(`https://www.wixapis.com/members/v1/members/${encodeURIComponent(data.userId)}`, { headers });
          if (userCheck.ok) return data.userId;
        } catch {}
      }
    } catch {}
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as PublishBody;
    const missing = ['userId', 'title', 'contentHtml'].filter((k) => !(body as any)[k]);
    if (missing.length) return J(400, { error: 'bad_request', missing });

    const SB_URL = Deno.env.get('SUPABASE_URL')!;
    const SB_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    // Load connection
    const { data: conn, error: selErr } = await supabase
      .from('wix_connections')
      .select('access_token, instance_id, wix_site_id, wix_author_member_id')
      .eq('user_id', body.userId)
      .maybeSingle();

    if (selErr) return J(500, { error: 'db_error', details: selErr });
    if (!conn?.access_token || !conn?.instance_id) return J(401, { error: 'not_connected' });

    // Build required headers and resolve site id if needed
    const accessToken = conn.access_token as string;
    const instanceId = conn.instance_id as string;
    let wixSiteId: string | null = (conn.wix_site_id as string | null) || (body.wixSiteId || null);

    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'wix-instance-id': instanceId,
    };
    if (wixSiteId) headers['wix-site-id'] = wixSiteId;

    // Best-effort discovery of wixSiteId
    if (!wixSiteId) {
      // 1) token-info
      try {
        const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'application/json' },
          body: JSON.stringify({ token: accessToken })
        });
        if (tri.ok) {
          const ti: any = await tri.json().catch(() => ({}));
          wixSiteId = ti?.siteId || null;
        }
      } catch {}
      // 2) site-properties (requires instance header)
      if (!wixSiteId) {
        try {
          const pr = await fetch('https://www.wixapis.com/site-properties/v4/properties', {
            method: 'GET',
            headers,
          });
          if (pr.ok) {
            const props: any = await pr.json().catch(() => ({}));
            wixSiteId = props?.properties?.siteId || props?.properties?.metaSiteId || props?.siteId || props?.site?.id || null;
          }
        } catch {}
      }
      // 3) site-list query
      if (!wixSiteId) {
        try {
          const q = await fetch('https://www.wixapis.com/site-list/v2/sites/query', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ paging: { limit: 1 } })
          });
          if (q.ok) {
            const qj: any = await q.json().catch(() => ({}));
            wixSiteId = qj?.sites?.[0]?.id || null;
          }
        } catch {}
      }
      if (wixSiteId) {
        headers['wix-site-id'] = wixSiteId;
        try {
          await supabase
            .from('wix_connections')
            .update({ wix_site_id: wixSiteId, updated_at: new Date().toISOString() })
            .eq('user_id', body.userId);
        } catch {}
      }
    }

    // Ensure we have a VALID memberId
    const resolvedMemberId = await resolveValidMemberId(headers, conn.wix_author_member_id || body.memberId || null);
    if (!resolvedMemberId) {
      return J(400, { error: 'missing_member_id', message: 'No valid member found. Reconnect Wix or ensure the site has at least one member.' });
    }
    if (resolvedMemberId !== conn.wix_author_member_id) {
      try {
        await supabase
          .from('wix_connections')
          .update({ wix_author_member_id: resolvedMemberId, updated_at: new Date().toISOString() })
          .eq('user_id', body.userId);
      } catch {}
    }

    // Preflight: ensure Blog app exists (non-blocking)
    let settingsOk = true;
    try {
      let sRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers });
      if (sRes.status === 404 && !('wix-site-id' in headers) && instanceId) {
        const retryHeaders = { ...headers, 'wix-site-id': instanceId } as Record<string,string>;
        sRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers: retryHeaders });
        if (sRes.ok) {
          headers['wix-site-id'] = instanceId;
        }
      }
      settingsOk = sRes.ok;
      if (!settingsOk) {
        // Don't block here; creation may still succeed if headers are fine
        const txt = await sRes.text();
        console.warn('[wix-blog-publish] settings check failed', { status: sRes.status, txt: txt.slice(0, 400) });
      }
    } catch (e) {
      console.warn('[wix-blog-publish] settings check error', String(e));
    }

    // Build RichContent from HTML
    const richContent = htmlToRichContent(body.contentHtml || '', body.title || 'Untitled');

    // Create draft with minimal, valid payload
    const createRes = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        draftPost: {
          title: body.title || 'Untitled',
          memberId: resolvedMemberId,
          excerpt: body.excerpt?.slice(0, 500) || '',
          richContent,
        },
      }),
    });
    const createTxt = await createRes.text();
    let createJson: any = createTxt; try { createJson = JSON.parse(createTxt); } catch {}
    if (!createRes.ok) {
      return J(createRes.status, {
        error: 'create_draft_failed',
        response: createJson,
        hint: 'memberId must exist on site; richContent must follow Ricos schema. Try reconnecting Wix to refresh members.'
      });
    }

    const draftId = createJson?.draftPost?.id || createJson?.id || createJson?.draftPost?._id || createJson?._id;
    if (!draftId) return J(502, { error: 'no_draft_id', response: createJson });

    // Publish draft
    const pubRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${encodeURIComponent(draftId)}/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const pubTxt = await pubRes.text();
    let pubJson: any = pubTxt; try { pubJson = JSON.parse(pubTxt); } catch {}
    if (!pubRes.ok) {
      return J(pubRes.status, { error: 'publish_failed', response: pubJson });
    }

    return J(200, { ok: true, post: pubJson?.post || pubJson });
  } catch (e) {
    return J(500, { error: 'internal_error', message: String(e) });
  }
});
