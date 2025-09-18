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
  wixSiteId?: string; // optional explicit site id
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

    // Pull tokens (and optional default member/site) saved during OAuth
    const { data: conn, error: selErr } = await supabase
      .from("wix_connections")
      .select("access_token, instance_id, default_member_id, wix_site_id")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (selErr) return J(500, { error: "db_error", details: selErr });
    if (!conn?.access_token) return J(401, { error: "not_connected", msg: "Reconnect Wix" });

    const accessToken = conn.access_token as string;
    // Get memberId from cms_installs or use provided one
    let memberId = body.memberId || conn?.default_member_id || Deno.env.get("WIX_DEFAULT_MEMBER_ID") || "";
    
    // If no memberId found, try to get it from the Wix Members API
    if (!memberId) {
      try {
        console.log("No memberId found, attempting to fetch from Wix Members API...");
        const membersRes = await fetch("https://www.wixapis.com/members/v1/members", {
          method: "GET",
          headers: {
            "authorization": `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        });
        
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          const members = membersData?.members || [];
          if (members.length > 0) {
            memberId = members[0].id; // Use first member as default
            
            // Save this memberId for future use
            await supabase
              .from("wix_connections")
              .update({ default_member_id: memberId })
              .eq("user_id", body.userId);
            
            console.log(`Found and saved memberId: ${memberId}`);
          }
        } else {
          console.log("Failed to fetch members:", membersRes.status, await membersRes.text());
        }
      } catch (e) {
        console.log("Error fetching memberId from Wix API:", e);
      }
    }
let wixSiteId = body.wixSiteId || conn?.wix_site_id || Deno.env.get("WIX_SITE_ID") || "";
const instanceId = (conn as any)?.instance_id || Deno.env.get("WIX_INSTANCE_ID") || "";

// Fallback: try to discover wix-site-id from token if missing
if (!wixSiteId) {
  try {
    const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ token: accessToken })
    });
    const triJson: any = await tri.json().catch(() => ({}));
    if (tri.ok && triJson?.siteId) {
      wixSiteId = triJson.siteId;
      // Persist for future publishes
      await supabase.from('wix_connections').update({ wix_site_id: wixSiteId }).eq('user_id', body.userId);
    }
  } catch (_) {
    // ignore
  }
}

    if (!memberId) {
      return J(400, { error: "member_required", msg: "Provide memberId or set WIX_DEFAULT_MEMBER_ID/default_member_id" });
    }

    // 1) Create draft — use explicit content shape and optional site/instance headers
    const createHeaders: Record<string,string> = {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json",
    };
    if (wixSiteId) createHeaders["wix-site-id"] = wixSiteId;
    if (instanceId) createHeaders["wix-instance-id"] = instanceId;

    const createBody = {
      draftPost: {
        title: body.title,
        content: { type: "html", html: body.contentHtml },
        excerpt: body.excerpt ?? "",
        tags: body.tags ?? [],
        categoryIds: body.categoryIds ?? [],
        memberId, // required for 3rd-party app drafts
      }
    };

    const draftRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: createHeaders,
      body: JSON.stringify(createBody),
    });

    const reqId = draftRes.headers.get("x-wix-request-id") || null;
    const draftText = await draftRes.text();
    let draftJson: any = draftText; try { draftJson = JSON.parse(draftText); } catch {}

    if (!draftRes.ok) {
      return J(draftRes.status, {
        error: "create_draft_failed",
        status: draftRes.status,
        wix_request_id: reqId,
        response: draftJson,
        sent: { memberId: !!memberId, hasSiteIdHeader: !!wixSiteId, hasInstanceIdHeader: !!instanceId, contentType: "html" },
      });
    }

    const draftId = draftJson?.draftPost?._id || draftJson?._id || draftJson?.id;
    if (!draftId) {
      return J(502, { error: "missing_draft_id", wix_request_id: reqId, response: draftJson });
    }

    // 2) Publish draft
    const pubRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${encodeURIComponent(draftId)}/publish`, {
      method: "POST",
      headers: createHeaders,
      body: JSON.stringify({}),
    });

    const pubReqId = pubRes.headers.get("x-wix-request-id") || null;
    const pubText = await pubRes.text();
    let pubJson: any = pubText; try { pubJson = JSON.parse(pubText); } catch {}

    if (!pubRes.ok) {
      return J(pubRes.status, {
        error: "publish_failed",
        status: pubRes.status,
        wix_request_id: pubReqId,
        response: pubJson,
      });
    }

    return J(200, {
      ok: true,
      draftId,
      wix_request_id: pubReqId || reqId,
      result: pubJson,
    });

  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});
