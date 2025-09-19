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
    const instanceId = (conn.instance_id as string | null) ?? "";
    const wixSiteId = body.wixSiteId || (conn.wix_site_id as string | null) || (Deno.env.get("WIX_SITE_ID") ?? "");
    const memberId = body.memberId || conn?.default_member_id || (Deno.env.get("WIX_DEFAULT_MEMBER_ID") ?? "");

    if (!memberId) {
      return J(400, { error: "member_required", msg: "Provide memberId or set WIX_DEFAULT_MEMBER_ID/default_member_id" });
    }

    // Build common headers — IMPORTANT: include instance and (if known) site id
    const headers: Record<string,string> = {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    };
    if (instanceId) headers["wix-instance-id"] = instanceId;
    if (wixSiteId)  headers["wix-site-id"] = wixSiteId;

    // Preflight: verify blog instance exists for this site
    // Small, cheap call that fails clearly if the Blog app isn't installed.
    const settingsRes = await fetch("https://www.wixapis.com/blog/v3/settings", {
      method: "GET",
      headers,
    });
    const settingsText = await settingsRes.text();
    let settingsJson: any = settingsText; try { settingsJson = JSON.parse(settingsText); } catch {}
    const settingsReqId = settingsRes.headers.get("x-wix-request-id") || null;

    if (settingsRes.status === 401 || settingsRes.status === 403) {
      return J(settingsRes.status, {
        error: "unauthenticated_or_forbidden",
        msg: "Token/site/instance mismatch. Ensure Wix Blog is installed for this site and headers include wix-instance-id (and wix-site-id if needed).",
        wix_request_id: settingsReqId,
        response: settingsJson,
        sent_headers: { hasInstanceId: !!instanceId, hasSiteId: !!wixSiteId }
      });
    }
    if (settingsRes.status === 404 || (settingsJson && settingsJson.message?.toLowerCase?.().includes("no blog"))) {
      return J(404, {
        error: "no_blog_instance",
        msg: "This site has no Wix Blog instance. Install the 'Wix Blog' app on your site, then retry.",
        wix_request_id: settingsReqId,
        sent_headers: { hasInstanceId: !!instanceId, hasSiteId: !!wixSiteId }
      });
    }
    if (!settingsRes.ok) {
      return J(settingsRes.status, {
        error: "blog_settings_failed",
        wix_request_id: settingsReqId,
        response: settingsJson
      });
    }

    // 1) Create draft
    const createRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: body.title,
        content: { type: "html", html: body.contentHtml },
        excerpt: body.excerpt ?? "",
        tags: body.tags ?? [],
        categoryIds: body.categoryIds ?? [],
        memberId, // required for 3rd-party apps
      }),
    });
    const createText = await createRes.text();
    let createJson: any = createText; try { createJson = JSON.parse(createText); } catch {}
    const createReqId = createRes.headers.get("x-wix-request-id") || null;

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
      wix_request_id: publishReqId || createReqId || settingsReqId,
      result: publishJson
    });

  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});