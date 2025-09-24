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

// Minimal, valid RichContent payload (Ricos schema)
function toRichContentSafe(title: string, text: string) {
  const safeTitle = (title || 'Untitled').slice(0, 200);
  const safeText = (text || '').slice(0, 40000);
  return {
    nodes: [
      {
        type: 'HEADING',
        headingData: { level: 1 },
        nodes: [
          { type: 'TEXT', textData: { text: safeTitle, decorations: [] } },
        ],
      },
      {
        type: 'PARAGRAPH',
        nodes: [
          { type: 'TEXT', textData: { text: safeText, decorations: [] } },
        ],
      },
    ],
    metadata: { version: 1 },
    documentStyle: {},
  } as const;
}

function stripHtml(html: string) {
  try { return (html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); } catch { return ''; }
}

async function resolveValidMemberId(headers: Record<string, string>, candidate?: string | null) {
  console.log('[wix-blog-publish] Resolving member ID, candidate:', candidate);
  
  // If we have a candidate, verify it exists
  if (candidate) {
    try {
      const r = await fetch(`https://www.wixapis.com/members/v1/members/${encodeURIComponent(candidate)}`, { headers });
      console.log('[wix-blog-publish] Candidate validation response:', r.status);
      if (r.ok) return candidate;
    } catch (e) {
      console.warn('[wix-blog-publish] Candidate validation error:', e);
    }
  }
  
  // Fallback: pick first approved (or just first) member
  try {
    const res = await fetch('https://www.wixapis.com/members/v1/members?limit=50&fieldsets=FULL', { headers });
    const resText = await res.text();
    console.log('[wix-blog-publish] Members API response:', res.status, resText.slice(0, 500));
    
    if (!res.ok) {
      // Try without fieldsets parameter as fallback
      const simpleRes = await fetch('https://www.wixapis.com/members/v1/members?limit=50', { headers });
      const simpleText = await simpleRes.text();
      console.log('[wix-blog-publish] Simple members API response:', simpleRes.status, simpleText.slice(0, 500));
      
      if (simpleRes.ok) {
        const simpleJs: any = JSON.parse(simpleText);
        const member = simpleJs?.members?.find((m: any) => m.status === 'APPROVED') || simpleJs?.members?.[0];
        if (member?.id) {
          console.log('[wix-blog-publish] Found member via simple API:', member.id);
          return member.id;
        }
      }
      return null;
    }
    
    const js: any = JSON.parse(resText);
    // Prefer approved members, but fall back to any member
    const member = js?.members?.find((m: any) => m.status === 'APPROVED') || js?.members?.[0];
    console.log('[wix-blog-publish] Found members count:', js?.members?.length || 0, 'selected:', member?.id);
    return member?.id || null;
  } catch (e) {
    console.error('[wix-blog-publish] Members fetch error:', e);
    return null;
  }
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
    if (!conn?.access_token || !conn?.instance_id) {
      console.log('[wix-blog-publish] No valid connection found', { 
        hasConnection: !!conn, 
        hasAccessToken: !!conn?.access_token, 
        hasInstanceId: !!conn?.instance_id 
      });
      return J(401, { error: 'not_connected', message: 'Please reconnect your Wix integration.' });
    }

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

    // Best-effort discovery of wixSiteId with improved logic
    if (!wixSiteId) {
      console.log('[wix-blog-publish] Attempting site ID discovery...');
      
      // 1) Try instance_id as site_id first (most common case)
      if (instanceId) {
        console.log('[wix-blog-publish] Trying instanceId as siteId:', instanceId);
        try {
          const testHeaders = { ...headers, 'wix-site-id': instanceId };
          const testRes = await fetch('https://www.wixapis.com/blog/v3/settings', { 
            method: 'GET', 
            headers: testHeaders 
          });
          console.log('[wix-blog-publish] instanceId test response:', testRes.status);
          if (testRes.ok) {
            wixSiteId = instanceId;
            headers['wix-site-id'] = wixSiteId;
            console.log('[wix-blog-publish] Successfully used instanceId as siteId');
          } else {
            const errorText = await testRes.text();
            console.log('[wix-blog-publish] instanceId test failed:', errorText.slice(0, 200));
          }
        } catch (e) {
          console.warn('[wix-blog-publish] instanceId test failed:', e);
        }
      }

      // 2) token-info approach
      if (!wixSiteId) {
        try {
          console.log('[wix-blog-publish] Trying token-info approach...');
          const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify({ token: accessToken })
          });
          if (tri.ok) {
            const ti: any = await tri.json().catch(() => ({}));
            wixSiteId = ti?.siteId || ti?.metaSiteId || null;
            console.log('[wix-blog-publish] Token-info result:', { siteId: wixSiteId });
            if (wixSiteId) headers['wix-site-id'] = wixSiteId;
          } else {
            console.log('[wix-blog-publish] Token-info failed with status:', tri.status);
          }
        } catch (e) {
          console.warn('[wix-blog-publish] token-info failed:', e);
        }
      }
      
      // 3) site-properties (requires instance header)
      if (!wixSiteId && instanceId) {
        try {
          console.log('[wix-blog-publish] Trying site-properties...');
          const propHeaders = { 
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'wix-instance-id': instanceId
          };
          
          const pr = await fetch('https://www.wixapis.com/site-properties/v4/properties', {
            method: 'GET',
            headers: propHeaders,
          });
          if (pr.ok) {
            const props: any = await pr.json().catch(() => ({}));
            wixSiteId = props?.properties?.siteId || props?.properties?.metaSiteId || props?.siteId || props?.site?.id || null;
            console.log('[wix-blog-publish] Site-properties result:', { siteId: wixSiteId });
            if (wixSiteId) headers['wix-site-id'] = wixSiteId;
          } else {
            console.log('[wix-blog-publish] Site-properties failed with status:', pr.status);
          }
        } catch (e) {
          console.warn('[wix-blog-publish] site-properties failed:', e);
        }
      }
      
      // 4) site-list query as last resort
      if (!wixSiteId) {
        try {
          console.log('[wix-blog-publish] Trying site-list query...');
          const q = await fetch('https://www.wixapis.com/site-list/v2/sites/query', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ paging: { limit: 1 } })
          });
          if (q.ok) {
            const qj: any = await q.json().catch(() => ({}));
            wixSiteId = qj?.sites?.[0]?.id || null;
            console.log('[wix-blog-publish] Site-list result:', { siteId: wixSiteId });
            if (wixSiteId) headers['wix-site-id'] = wixSiteId;
          } else {
            console.log('[wix-blog-publish] Site-list failed with status:', q.status);
          }
        } catch (e) {
          console.warn('[wix-blog-publish] site-list failed:', e);
        }
      }
      
      if (wixSiteId) {
        console.log('[wix-blog-publish] Site ID resolved:', wixSiteId);
        try {
          await supabase
            .from('wix_connections')
            .update({ wix_site_id: wixSiteId, updated_at: new Date().toISOString() })
            .eq('user_id', body.userId);
          console.log('[wix-blog-publish] Site ID saved to database');
        } catch (e) {
          console.warn('[wix-blog-publish] Failed to save site ID:', e);
        }
      } else {
        console.error('[wix-blog-publish] Failed to resolve site ID');
        return J(400, { 
          error: 'site_id_resolution_failed',
          message: 'Unable to determine Wix site ID. Please reconnect your Wix integration.',
          debug: { 
            instanceId, 
            hasAccessToken: !!accessToken,
            attempts: ['instanceId_as_siteId', 'token_info', 'site_properties', 'site_list']
          },
          solution: 'Try disconnecting and reconnecting your Wix integration from the Settings page.'
        });
      }
    }

    // Ensure we have a VALID memberId with better error handling
    console.log('[wix-blog-publish] Resolving member ID...', { 
      candidateId: conn.wix_author_member_id || body.memberId,
      siteId: wixSiteId 
    });
    
    const resolvedMemberId = await resolveValidMemberId(headers, conn.wix_author_member_id || body.memberId || null);
    
    if (!resolvedMemberId) {
      console.error('[wix-blog-publish] No valid member found.');
      
      // Try to get more diagnostic info
      let diagnosticInfo = '';
      try {
        const membersTestRes = await fetch('https://www.wixapis.com/members/v1/members?limit=1', { headers });
        const membersTestText = await membersTestRes.text();
        diagnosticInfo = `Members API test: ${membersTestRes.status} - ${membersTestText.slice(0, 200)}`;
      } catch (e) {
        diagnosticInfo = `Members API test failed: ${String(e)}`;
      }
      
      return J(400, { 
        error: 'missing_member_id', 
        message: 'No valid member found. This site needs at least one approved member to publish blog posts. Please ensure the Wix site has the Members app installed and at least one member.',
        debug: {
          candidateMemberId: conn.wix_author_member_id || body.memberId,
          siteId: wixSiteId,
          hasInstanceId: !!instanceId,
          diagnosticInfo
        },
        solution: 'Please go to your Wix site, install the Members app if not already installed, and ensure you have at least one approved member. Then reconnect your Wix integration.'
      });
    }
    
    console.log('[wix-blog-publish] Using member ID:', resolvedMemberId);
    if (resolvedMemberId !== conn.wix_author_member_id) {
      try {
        await supabase
          .from('wix_connections')
          .update({ wix_author_member_id: resolvedMemberId, updated_at: new Date().toISOString() })
          .eq('user_id', body.userId);
      } catch {}
    }

    // Preflight: ensure Blog app exists and Members app is available
    let blogAppInstalled = true;
    let membersAppAvailable = true;
    
    try {
      console.log('[wix-blog-publish] Checking Blog app installation...');
      let sRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers });
      
      if (sRes.status === 404) {
        console.log('[wix-blog-publish] Blog app not found, checking with different headers...');
        if (instanceId && !headers['wix-site-id']) {
          const retryHeaders = { ...headers, 'wix-site-id': instanceId };
          sRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers: retryHeaders });
          if (sRes.ok) {
            headers['wix-site-id'] = instanceId;
            wixSiteId = instanceId;
          }
        }
      }
      
      blogAppInstalled = sRes.ok;
      if (!blogAppInstalled) {
        const errorText = await sRes.text();
        console.error('[wix-blog-publish] Blog app check failed:', { status: sRes.status, error: errorText.slice(0, 400) });
        
        return J(400, {
          error: 'blog_app_missing',
          message: 'The Wix Blog app is not installed on this site. Please install the Blog app from the Wix App Market.',
          debug: { status: sRes.status, siteId: wixSiteId, instanceId }
        });
      }
      
      console.log('[wix-blog-publish] Blog app confirmed installed');
    } catch (e) {
      console.error('[wix-blog-publish] Blog app check error:', String(e));
      return J(500, {
        error: 'blog_app_check_failed',
        message: 'Unable to verify Blog app installation. Please try reconnecting Wix.',
        debug: { error: String(e) }
      });
    }

    // Sanitize body and build RichContent
    const text = (body.plainText && body.plainText.trim().length > 0)
      ? body.plainText
      : stripHtml(body.contentHtml || '');
    const richContent = toRichContentSafe(body.title || 'Untitled', text);

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
