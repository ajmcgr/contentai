import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as PublishBody;
    const missing = ["userId","title","contentHtml"].filter(k => !(body as any)[k]);
    if (missing.length) return J(400, { error: "bad_request", missing });

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    const { data: conn } = await supabase
      .from('wix_connections')
      .select('access_token, instance_id, wix_site_id, wix_author_member_id')
      .eq('user_id', body.userId)
      .maybeSingle();

    if (!conn?.access_token || !conn?.instance_id) return J(401, { error: 'not_connected' });

    const headers: Record<string,string> = {
      authorization: `Bearer ${conn.access_token}`,
      'content-type': 'application/json',
      'wix-instance-id': conn.instance_id,
    };
    if (conn.wix_site_id) headers['wix-site-id'] = conn.wix_site_id;

    // --- minimal RichContent to avoid plugin/app errors ---
    function toRichContentSafe(title: string, text: string) {
      return {
        nodes: [
          { type: 'HEADING', level: 1, nodes: [{ type: 'TEXT', text: title }] },
          { type: 'PARAGRAPH', nodes: [{ type: 'TEXT', text }] },
        ],
        metadata: { version: 1 },
        documentStyle: {},
      };
    }

    // Build draft payload (NO unknown plugin blocks, NO non-existent category/tag IDs)
    const authorMemberId = conn.wix_author_member_id || body.memberId || null;
    if (!authorMemberId) {
      return J(400, { error: 'missing_member_id', message: 'No author memberId. Reconnect Wix or set one in DB.' });
    }

    const draftPost = {
      title: body.title || 'Untitled',
      memberId: authorMemberId,                     // <-- REQUIRED for 3rd-party apps
      excerpt: body.excerpt?.slice(0, 500) || '',
      richContent: toRichContentSafe(body.title || 'Untitled', (body.plainText || '').slice(0, 40000)),
      // categoryIds: []   // only include if you map names -> existing IDs first
      // tagIds: []        // same rule
    };

    console.log('[Wix Publish] Using headers', {
      hasInstanceId: !!headers['wix-instance-id'],
      hasSiteId: !!headers['wix-site-id'],
    });

    // Preflight: confirm blog present
    const settingsRes = await fetch('https://www.wixapis.com/blog/v3/settings', { method: 'GET', headers });
    if (settingsRes.status === 404) {
      return J(404, { error: 'no_blog_instance', message: 'Install "Blog by Wix" on the connected site.' });
    }
    if (!settingsRes.ok) {
      const t = await settingsRes.text();
      return J(settingsRes.status, { error: 'blog_settings_failed', response: t });
    }

    // Create draft
    const createRes = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ draftPost }),
    });
    const createTxt = await createRes.text();
    let createJson: any = createTxt; try { createJson = JSON.parse(createTxt); } catch {}
    if (!createRes.ok) {
      return J(createRes.status, {
        error: 'create_draft_failed',
        response: createJson,
        hint: 'Make sure memberId exists and richContent is minimal JSON (no unknown plugins).',
      });
    }

    const draftId = createJson?.draftPost?.id;
    if (!draftId) return J(502, { error: 'no_draft_id', response: createJson });

    // Publish draft
    const pubRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${draftId}/publish`, {
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
    return J(500, { error: "internal_error", message: String(e) });
  }
});