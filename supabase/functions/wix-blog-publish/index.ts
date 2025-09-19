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
  // If we have a candidate, verify it exists
  if (candidate) {
    try {
      const r = await fetch(`https://www.wixapis.com/members/v1/members/${encodeURIComponent(candidate)}`, { headers });
      if (r.ok) return candidate;
    } catch {}
  }
  // Fallback: pick first approved (or just first) member
  try {
    const res = await fetch('https://www.wixapis.com/members/v1/members?limit=1&fieldsets=FULL', { headers });
    const js: any = await res.json().catch(() => ({}));
    const m = js?.members?.[0];
    return m?.id || null;
  } catch {
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
    if (!conn?.access_token || !conn?.instance_id) return J(401, { error: 'not_connected' });

    // Build required headers
    const headers: Record<string, string> = {
      authorization: `Bearer ${conn.access_token}`,
      'content-type': 'application/json',
      'wix-instance-id': conn.instance_id,
    };
    if (conn.wix_site_id) headers['wix-site-id'] = conn.wix_site_id;

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

    // Preflight: ensure Blog app exists
    const settingsRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers });
    if (settingsRes.status === 404) {
      return J(404, { error: 'no_blog_instance', message: 'Install “Blog by Wix” on the connected site.' });
    }
    if (!settingsRes.ok) {
      const t = await settingsRes.text();
      return J(settingsRes.status, { error: 'blog_settings_failed', response: t });
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
