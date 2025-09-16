// Deno / Supabase Edge
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Secrets = { WIX_CLIENT_ID: string; WIX_CLIENT_SECRET: string; WIX_REDIRECT_URI: string; };

function topRedirectHtml(targetUrl: string) {
  const safe = targetUrl.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return new Response(
`<!doctype html><html><head><meta charset="utf-8"><title>Redirecting…</title></head>
<body>
  <noscript><p>Click <a href="${safe}" target="_top" rel="noopener">continue</a>.</p></noscript>
  <script>
    (function(){
      var u="${safe}";
      try{ if(window.top && window.top!==window.self){ window.top.location.href=u; } else { window.location.href=u; } }
      catch(e){ window.open(u,"_blank","noopener,noreferrer"); }
    })();
  </script>
</body></html>`,
    { status: 200, headers: { "content-type":"text/html; charset=utf-8", "cache-control":"no-store" } }
  );
}

async function getSecrets(): Promise<Secrets> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const { data, error } = await sb.from("app_secrets").select("key,value").eq("namespace","cms_integrations");
  if (error) throw new Error("secrets fetch failed: "+error.message);
  const map = Object.fromEntries((data||[]).map((r:any)=>[r.key, String(r.value||"").trim()]));
  for (const k of ["WIX_CLIENT_ID","WIX_CLIENT_SECRET","WIX_REDIRECT_URI"]) if (!map[k]) throw new Error(`missing secret: ${k}`);
  return { WIX_CLIENT_ID: map.WIX_CLIENT_ID, WIX_CLIENT_SECRET: map.WIX_CLIENT_SECRET, WIX_REDIRECT_URI: map.WIX_REDIRECT_URI };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const userId = String(u.searchParams.get("userId") || "unknown");
  const rid = crypto.randomUUID();
  try {
    const { WIX_CLIENT_ID, WIX_REDIRECT_URI } = await getSecrets();

    // Wix Installer URL (lets user pick the site)
    const auth = new URL("https://www.wix.com/installer/install");
    auth.searchParams.set("appId", WIX_CLIENT_ID);
    auth.searchParams.set("redirectUrl", WIX_REDIRECT_URI);
    // carry userId as state for round-trip (optional, you can encode JSON/base64 if needed)
    auth.searchParams.set("state", userId);

    console.log("[wix-start]", rid, { appId: WIX_CLIENT_ID.slice(0,6)+"…", redirect: WIX_REDIRECT_URI, state: userId });
    
    // Return iframe-safe redirect that opens new tab if top navigation fails
    const installerUrl = auth.toString();
    return new Response(`<!doctype html><meta charset="utf-8">
<script>
 (function(){
   var u=${JSON.stringify(installerUrl)};
   try {
     if (window.top && window.top !== window.self) {
       // Try top-nav; if any policy blocks it, fallback opens a new tab.
       try { window.top.location.href = u; return; } catch(e){}
       window.open(u, "_blank", "noopener,noreferrer"); return;
     }
     window.location.href = u;
   } catch (e) { window.open(u, "_blank", "noopener,noreferrer"); }
 })();
</script>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }});
  } catch (e) {
    console.error("[wix-start]", rid, "error", e?.message || String(e));
    return new Response("wix_start_failed", { status: 500, headers: { "content-type":"text/plain" } });
  }
});