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
    const memberId = body.memberId || conn?.default_member_id || null;

    // Skip member ID validation for now - let Wix handle it automatically

    // Build common headers — IMPORTANT: include instance and (if known) site id
    const headers: Record<string,string> = {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    };
    // Only add these headers if we have them (some older connections may not have them)
    if (instanceId) headers["wix-instance-id"] = instanceId;
    if (wixSiteId) headers["wix-site-id"] = wixSiteId;

    // --- Preflight: confirm this token points at the blog we expect ---
    const expectedHost = "alex33379.wixsite.com";

    const pre = await fetch("https://www.wixapis.com/blog/v3/settings", {
      method: "GET",
      headers, // must include Bearer token (+ wix-instance-id / wix-site-id if you have them)
    });
    const preText = await pre.text();
    let preJson: any = preText; try { preJson = JSON.parse(preText); } catch {}
    const wixReqId = pre.headers.get("x-wix-request-id") || null;

    // Derive the connected host for this token
    const rawUrl = preJson?.blogUrl?.url || preJson?.siteUrl || "";
    let connectedHost = "unknown";
    try { connectedHost = new URL(rawUrl).host; } catch {}

    if (pre.status === 404) {
      // If we lack instance/site headers, don't block here — Wix may need these to resolve the blog
      if (headers["wix-instance-id"] || headers["wix-site-id"]) {
        return J(404, {
          error: "no_blog_instance",
          message: "This site has no Wix Blog installed. In your Wix site: Apps → Add Apps → 'Blog by Wix' → Add, then Publish the site.",
          wix_request_id: wixReqId,
          sent_headers: { hasInstanceId: !!headers["wix-instance-id"], hasSiteId: !!headers["wix-site-id"] }
        });
      }
      // proceed without preflight; subsequent calls will surface clearer errors
    }

    if (!pre.ok) {
      // If we have proper context headers, bubble the error; otherwise continue
      if (headers["wix-instance-id"] || headers["wix-site-id"]) {
        return J(pre.status, {
          error: "blog_settings_failed",
          wix_request_id: wixReqId,
          response: preJson,
          hint: "If 401/403: ensure app is installed on this site and headers include wix-instance-id (and wix-site-id if available)."
        });
      }
      // proceed without preflight
    }

    // Guard: refuse to publish if we're bound to a different site (only when we could detect it)
    if (connectedHost !== "unknown" && !String(connectedHost).includes(expectedHost)) {
      return J(412, {
        error: "wrong_site_bound",
        msg: `Connected to "${connectedHost}", but this project targets "${expectedHost}". Reconnect the Wix app and select the correct site.`,
        wix_request_id: wixReqId
      });
    }

    // 1) Create draft
    const createRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        draftPost: {
          title: body.title,
          content: { type: "html", html: body.contentHtml },
          excerpt: body.excerpt ?? "",
          tags: body.tags ?? [],
          categoryIds: body.categoryIds ?? [],
          ...(memberId && { memberId }), // only include if we have a valid member ID
        }
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
      wix_request_id: publishReqId || createReqId || wixReqId,
      result: publishJson
    });

  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});