import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
function J(s:number,d:unknown){return new Response(JSON.stringify(d),{status:s,headers:{...CORS,"content-type":"application/json"}})}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { userId } = await req.json().catch(()=> ({}));
    if (!userId) return J(400, { error: "missing_userId" });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false }});
    const { data: conn, error } = await sb
      .from("wix_connections")
      .select("access_token, instance_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !conn?.access_token) return J(404, { error: "not_connected" });

    const headers: Record<string,string> = {
      authorization: `Bearer ${conn.access_token}`,
      "content-type": "application/json",
    };
    if (conn.instance_id) headers["wix-instance-id"] = conn.instance_id;

    // Ask Wix for the blog/site URL
    const r = await fetch("https://www.wixapis.com/blog/v3/settings", { method: "GET", headers });
    const txt = await r.text(); let js:any = txt; try { js = JSON.parse(txt); } catch {}
    if (!r.ok) return J(r.status, { error: "wix_settings_failed", response: js });

    const url = js?.blogUrl?.url || js?.siteUrl || "";
    let host: string | null = null; try { host = new URL(url).host; } catch { host = null; }

    await sb.from("wix_connections").update({
      wix_host: host,
      wix_site_url: url || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    return J(200, { ok: true, wix_host: host, wix_site_url: url });
  } catch (e) {
    return J(500, { error: "internal_error", message: String(e) });
  }
});