import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Secrets = { WIX_CLIENT_ID: string; WIX_CLIENT_SECRET: string; WIX_REDIRECT_URI: string; };

async function getSecrets(): Promise<Secrets> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const { data, error } = await sb.from("app_secrets").select("key,value").eq("namespace","cms_integrations");
  if (error) throw new Error("secrets fetch failed: " + error.message);
  const map = Object.fromEntries((data||[]).map((r:any)=>[r.key, String(r.value||"").trim()]));
  return { WIX_CLIENT_ID: map.WIX_CLIENT_ID, WIX_CLIENT_SECRET: map.WIX_CLIENT_SECRET, WIX_REDIRECT_URI: map.WIX_REDIRECT_URI };
}

function html(msg: string, back?: string) {
  const s = back ? `<script>setTimeout(()=>{location.href='${back}'},1200)</script>` : "";
  return new Response(`<!doctype html><html><body><pre>${msg}</pre>${s}</body></html>`,
    { status: 200, headers: { "content-type":"text/html; charset=utf-8", "cache-control":"no-store" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const rid = crypto.randomUUID();
  try {
    const code = String(url.searchParams.get("code") || "");
    const state = String(url.searchParams.get("state") || "unknown"); // you passed userId as state
    if (!code) return html("Missing code");

    const { WIX_CLIENT_ID, WIX_CLIENT_SECRET, WIX_REDIRECT_URI } = await getSecrets();

    // Exchange code → tokens
    const tokenRes = await fetch("https://www.wix.com/oauth/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: WIX_CLIENT_ID,
        client_secret: WIX_CLIENT_SECRET,
        code,
        redirect_uri: WIX_REDIRECT_URI
      })
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.access_token) {
      console.error("[wix-cb]", rid, "token error", tok);
      return html("Token exchange failed. See logs.");
    }
    const access_token = tok.access_token as string;
    const refresh_token = tok.refresh_token as (string | undefined);

    // Probe Blog API to verify permission
    const probe = await fetch("https://www.wixapis.com/blog/v3/posts?limit=1", {
      headers: { "Authorization": `Bearer ${access_token}` }
    });
    const probeJson = await probe.json();
    const ok = probe.ok;

    // Store install (provider 'wix'); external_id optional — you can backfill siteId later
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: upErr } = await sb.from("cms_installs").upsert({
      user_id: state || "unknown",
      provider: "wix",
      external_id: "wix-site", // optional: fetch actual siteId if needed
      access_token,
      refresh_token,
      scope: "", // Wix manages permissions at app config; keep blank/optional
      extra: {}
    }, { onConflict: "user_id,provider,external_id" });
    if (upErr) console.error("[wix-cb]", rid, "upsert error", upErr);

    const msg = ok ? `✅ Wix access OK. Posts len: ${(probeJson?.posts?.length ?? 0)}` 
                   : `⚠️ Wix blog probe failed: ${JSON.stringify(probeJson).slice(0,400)}`;
    // Redirect back to Settings
    const back = `https://hmrzmafwvhifjhsoizil.lovable.app/dashboard/settings?wix_ok=${ok ? "1" : "0"}`;
    return html(msg, back);
  } catch (e) {
    console.error("[wix-cb]", rid, "error", e?.message || String(e));
    return html("Callback failed. See logs.");
  }
});