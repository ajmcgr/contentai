import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};

type PublishBody = {
  userId: string;                 // our app user id (to find tokens)
  title: string;
  contentHtml: string;            // blog HTML (rich content ok if already HTML)
  excerpt?: string;
  tags?: string[];
  categoryIds?: string[];
  memberId?: string;              // ✅ required by Wix for 3rd-party apps (if absent, we'll use a default)
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, "content-type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const body = await req.json() as PublishBody;
    const missing = ["userId","title","contentHtml"].filter(k => !(body as any)[k]);
    if (missing.length) return json(400, { error: `Missing fields: ${missing.join(", ")}` });

    // Load tokens from DB (saved during oauth callback)
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    const { data: row, error: selErr } = await supabase
      .from("wix_connections")
      .select("access_token, instance_id")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (selErr || !row?.access_token) {
      return json(401, { error: "No Wix tokens for this user. Reconnect Wix." });
    }

    const accessToken = row.access_token as string;
    const instanceId = row.instance_id as string | null;

    // Get memberId from cms_installs or use provided one
    let memberId = body.memberId;
    if (!memberId) {
      const { data: install } = await supabase
        .from("cms_installs")
        .select("extra")
        .eq("user_id", body.userId)
        .eq("provider", "wix")
        .maybeSingle();
      
      memberId = install?.extra?.memberId || Deno.env.get("WIX_DEFAULT_MEMBER_ID") || "";
    }

    // Wix Blog: 3rd-party apps require memberId when creating a draft
    // Docs: Create Draft Post (REST) — "For 3rd-party apps, `memberId` is a required field."
    // https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/create-draft-post
    if (!memberId) {
      return json(400, { error: "Wix `memberId` is required for draft creation. Provide one or set WIX_DEFAULT_MEMBER_ID / default_member_id." });
    }

    const headers: Record<string, string> = {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json"
    };

    // Add instance ID header if available
    if (instanceId) {
      headers["wix-instance-id"] = instanceId;
    }

    // 1) Create Draft
    const createDraftRes = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: body.title,
        content: { html: body.contentHtml },
        excerpt: body.excerpt ?? "",
        tags: body.tags ?? [],
        categoryIds: body.categoryIds ?? [],
        memberId // ✅ required for 3rd-party apps
      })
    });

    const draftRaw = await createDraftRes.text();
    let draft: any = draftRaw; 
    try { 
      draft = JSON.parse(draftRaw); 
    } catch {
      // keep as string if not JSON
    }
    
    if (!createDraftRes.ok) {
      return json(createDraftRes.status, {
        error: "create_draft_failed",
        status: createDraftRes.status,
        response: draft
      });
    }

    const draftId = draft?.draftPost?._id || draft?._id || draft?.id;
    if (!draftId) return json(502, { error: "missing_draft_id", draft });

    // 2) Publish Draft
    const publishRes = await fetch(`https://www.wixapis.com/blog/v3/draft-posts/${encodeURIComponent(draftId)}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({}) // no body required per docs
    });

    const pubRaw = await publishRes.text();
    let pub: any = pubRaw; 
    try { 
      pub = JSON.parse(pubRaw); 
    } catch {
      // keep as string if not JSON
    }
    
    if (!publishRes.ok) {
      return json(publishRes.status, {
        error: "publish_failed",
        status: publishRes.status,
        response: pub
      });
    }

    return json(200, { ok: true, draftId, result: pub });
  } catch (e) {
    return json(500, { error: "internal_error", message: String(e) });
  }
});
