import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};

function J(status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid") || "";
    if (!uid) return J(400, { error: "missing_uid" });

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    // tokens + instance/site ids saved during OAuth
    const { data: conn, error } = await supabase
      .from("wix_connections")
      .select("access_token, instance_id, wix_site_id, wix_host")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return J(500, { error: "db_error", details: error });
    if (!conn?.access_token) return J(404, { error: "not_connected" });

    const headers: Record<string,string> = {
      authorization: `Bearer ${conn.access_token}`,
      "content-type": "application/json",
    };
    if (conn.instance_id) headers["wix-instance-id"] = conn.instance_id;
    if (conn.wix_site_id) headers["wix-site-id"] = conn.wix_site_id;

    // Blog settings usually reveals site-related info; also try site-info endpoint
    const settingsRes = await fetch("https://www.wixapis.com/blog/v3/settings", { headers, method: "GET" });
    const settingsText = await settingsRes.text();
    let settings: any = settingsText; try { settings = JSON.parse(settingsText); } catch {}

    // Optional: Sites API (only if we have a site id in DB/env)
    let site: any = null;
    const siteId = conn.wix_site_id || Deno.env.get("WIX_SITE_ID") || "";
    if (siteId) {
      const siteRes = await fetch("https://www.wixapis.com/site-list/v2/sites/query", {
        method: "POST",
        headers: { ...headers }, // requires account-level auth for full list; safe to ignore if 401
        body: JSON.stringify({ filter: { "siteIds": [siteId] }, limit: 1 }),
      });
      const siteText = await siteRes.text();
      try { site = JSON.parse(siteText); } catch { site = { raw: siteText }; }
    }

    return J(200, {
      ok: true,
      instanceId: conn.instance_id || null,
      wixSiteId: siteId || null,
      wixHost: (conn as any).wix_host || null,
      blogSettings: settings,
      siteQuery: site,
      siteUrl: ((conn as any).wix_host ? `https://${(conn as any).wix_host}` : null),
    });
  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});