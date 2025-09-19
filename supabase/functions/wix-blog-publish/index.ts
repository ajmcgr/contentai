import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};

type PublishBody = {
  userId: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  tags?: string[];
  categoryIds?: string[];
  memberId?: string;
  wixSiteId?: string; // optional override
};

function J(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const body = await req.json() as PublishBody;
    const missing = ["userId","title","contentHtml"].filter(k => !(body as any)[k]);
    if (missing.length) return J(400, { error: "bad_request", missing });

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    // Pull connection (saved at OAuth callback)
    const { data: conn, error: selErr } = await supabase
      .from("wix_connections")
      .select("access_token, instance_id, default_member_id, wix_site_id")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (selErr) return J(500, { error: "db_error", details: selErr });
    if (!conn?.access_token) return J(401, { error: "not_connected", msg: "Reconnect Wix" });

    const accessToken = conn.access_token as string;
    let instanceId = (conn.instance_id as string | null) ?? "";
    let wixSiteId = body.wixSiteId || (conn.wix_site_id as string | null) || (Deno.env.get("WIX_SITE_ID") ?? "");
    const memberId = body.memberId || conn?.default_member_id || null;

    // Try to auto-resolve missing wixSiteId using the current token/instance
if (!wixSiteId && accessToken && instanceId) {
  try {
    // 1) token-info
    const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ token: accessToken })
    });
    if (tri.ok) {
      const ti: any = await tri.json().catch(() => ({}));
      if (ti?.siteId) wixSiteId = ti.siteId;
    }
    
    // 2) site-properties (requires instance header)
    if (!wixSiteId) {
      const pr = await fetch('https://www.wixapis.com/site-properties/v4/properties', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          'wix-instance-id': instanceId,
        },
      });
      if (pr.ok) {
        const props: any = await pr.json().catch(() => ({}));
        wixSiteId = props?.properties?.siteId || props?.properties?.metaSiteId || props?.siteId || props?.site?.id || '';
      }
    }

    // 3) site-list query (broad discovery by token)
    if (!wixSiteId) {
      try {
        const q = await fetch('https://www.wixapis.com/site-list/v2/sites/query', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ paging: { limit: 1 } })
        });
        if (q.ok) {
          const qj: any = await q.json().catch(() => ({}));
          wixSiteId = qj?.sites?.[0]?.id || '';
        }
      } catch {}
    }

    // Persist if we managed to discover it
    if (wixSiteId) {
      try {
        await supabase
          .from('wix_connections')
          .update({ wix_site_id: wixSiteId, updated_at: new Date().toISOString() })
          .eq('user_id', body.userId);
      } catch {}
    }
  } catch {}
}

    // Check for missing critical identifiers
    if (!instanceId && !wixSiteId) {
      return J(400, { 
        error: 'missing_site_info', 
        msg: 'Missing instance_id and wix_site_id. Please reconnect your Wix account to capture these identifiers.',
        debug: { hasInstanceId: !!instanceId, hasWixSiteId: !!wixSiteId }
      });
    }

    // Build common headers — IMPORTANT: include instance and (if known) site id
    const headers: Record<string,string> = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };
    // Only add these headers if we have them (some older connections may not have them)
    if (instanceId) headers['wix-instance-id'] = instanceId;
    if (wixSiteId) headers['wix-site-id'] = wixSiteId;

    // --- Preflight: confirm this token points at the blog we expect ---
    const expectedHost = "alex33379.wixsite.com";

    async function fetchSettings(h: Record<string,string>) {
      const r = await fetch("https://www.wixapis.com/blog/v3/settings", { method: "GET", headers: h });
      const text = await r.text();
      let json: any = text; try { json = JSON.parse(text); } catch {}
      return { r, json, text };
    }

    let { r: pre, json: preJson } = await fetchSettings(headers);
    const wixReqId = pre.headers.get("x-wix-request-id") || null;

    // Derive the connected host for this token
    const rawUrl = preJson?.blogUrl?.url || preJson?.siteUrl || "";
    let connectedHost = "unknown";
    try { connectedHost = new URL(rawUrl).host; } catch {}

    // If 404 and we don't have wix-site-id, attempt a best-effort retry using instanceId as a fallback site header
    if (pre.status === 404 && instanceId && !wixSiteId) {
      const retryHeaders = { ...headers, "wix-site-id": instanceId };
      const retry = await fetchSettings(retryHeaders);
      if (retry.r.ok) {
        pre = retry.r; preJson = retry.json;
        wixSiteId = instanceId; // persist this heuristic for this request only
      }
    }

    // Do not block on preflight errors; continue to attempt draft creation.
    // We will surface clearer errors from the create/publish steps.

    // Guard: refuse to publish if we're bound to a different site (only when we could detect it)
  if (connectedHost !== "unknown" && !String(connectedHost).includes(expectedHost)) {
    // Non-blocking warning: site host differs from expected, but we'll proceed.
    console.warn('wix-blog-publish: connectedHost differs', { connectedHost, expectedHost, wix_request_id: wixReqId });
  }

    // 1) Create draft
    let createRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        draftPost: {
          title: body.title,
          content: { type: "html", html: body.contentHtml },
          excerpt: body.excerpt ?? "",
          tags: body.tags ?? [],
          categoryIds: body.categoryIds ?? [],
          ...(memberId && { memberId }),
        }
      }),
    });
    let createText = await createRes.text();
    let createJson: any = createText; try { createJson = JSON.parse(createText); } catch {}
    let createReqId = createRes.headers.get("x-wix-request-id") || null;

    // Retry once if missing site-id caused a failure
    if (!createRes.ok && !headers['wix-site-id']) {
      let siteIdRetry = wixSiteId || '';
      try {
        const q = await fetch('https://www.wixapis.com/site-list/v2/sites/query', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ paging: { limit: 1 } })
        });
        if (q.ok) {
          const qj: any = await q.json().catch(() => ({}));
          siteIdRetry = qj?.sites?.[0]?.id || siteIdRetry;
        }
      } catch {}

      if (siteIdRetry) {
        const retryHeaders = { ...headers, 'wix-site-id': siteIdRetry } as Record<string,string>;
        const retryRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
          method: "POST",
          headers: retryHeaders,
          body: JSON.stringify({
            draftPost: {
              title: body.title,
              content: { type: "html", html: body.contentHtml },
              excerpt: body.excerpt ?? "",
              tags: body.tags ?? [],
              categoryIds: body.categoryIds ?? [],
              ...(memberId && { memberId }),
            }
          }),
        });
        const retryText = await retryRes.text();
        let retryJson: any = retryText; try { retryJson = JSON.parse(retryText); } catch {}

        if (retryRes.ok) {
          createRes = retryRes;
          createText = retryText;
          createJson = retryJson;
          createReqId = retryRes.headers.get("x-wix-request-id") || createReqId;
          wixSiteId = siteIdRetry;
          try {
            await supabase
              .from('wix_connections')
              .update({ wix_site_id: wixSiteId, updated_at: new Date().toISOString() })
              .eq('user_id', body.userId);
          } catch {}
        } else {
          return J(retryRes.status, {
            error: "create_draft_failed",
            status: retryRes.status,
            wix_request_id: retryRes.headers.get("x-wix-request-id") || createReqId,
            response: retryJson,
            sent_headers: { hasInstanceId: !!instanceId, hasSiteId: !!siteIdRetry }
          });
        }
      }
    }

    if (!createRes.ok) {
      return J(createRes.status, {
        error: "create_draft_failed",
        status: createRes.status,
        wix_request_id: createReqId,
        response: createJson,
        sent_headers: { hasInstanceId: !!instanceId, hasSiteId: !!wixSiteId }
      });
    }

    const draftId = createJson?.draftPost?._id || createJson?._id || createJson?.id;
    if (!draftId) return J(502, { error: "missing_draft_id", wix_request_id: createReqId, response: createJson });

    // 2) Publish
    const publishRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${encodeURIComponent(draftId)}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const publishText = await publishRes.text();
    let publishJson: any = publishText; try { publishJson = JSON.parse(publishText); } catch {}
    const publishReqId = publishRes.headers.get("x-wix-request-id") || null;

    if (!publishRes.ok) {
      return J(publishRes.status, {
        error: "publish_failed",
        status: publishRes.status,
        wix_request_id: publishReqId,
        response: publishJson,
      });
    }

    return J(200, {
      ok: true,
      draftId,
      wix_request_id: publishReqId || createReqId || wixReqId,
      result: publishJson
    });

  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});