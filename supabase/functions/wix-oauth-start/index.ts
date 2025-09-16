// Deno / Supabase Edge
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

type Secrets = { WIX_CLIENT_ID: string; WIX_CLIENT_SECRET: string; WIX_REDIRECT_URI: string; };

async function getSecrets(): Promise<Secrets> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const { data, error } = await sb.from("app_secrets").select("key,value").eq("namespace", "cms_integrations");
  if (error) throw new Error("secrets fetch failed: " + error.message);
  const map = Object.fromEntries((data||[]).map((r:any)=>[r.key, String(r.value||"").trim()]));
  for (const k of ["WIX_CLIENT_ID","WIX_CLIENT_SECRET","WIX_REDIRECT_URI"]) {
    if (!map[k]) throw new Error(`missing secret: ${k}`);
  }
  return { WIX_CLIENT_ID: map.WIX_CLIENT_ID, WIX_CLIENT_SECRET: map.WIX_CLIENT_SECRET, WIX_REDIRECT_URI: map.WIX_REDIRECT_URI };
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const u = new URL(req.url);
  const userId = String(u.searchParams.get("userId") || "unknown");
  const rid = crypto.randomUUID();

  try {
    const { WIX_CLIENT_ID, WIX_REDIRECT_URI } = await getSecrets();
    // Build Wix Installer URL (lets user pick the site; redirectUrl must match app config)
    const auth = new URL("https://www.wix.com/installer/install");
    auth.searchParams.set("appId", WIX_CLIENT_ID);
    auth.searchParams.set("redirectUrl", WIX_REDIRECT_URI);
    // carry a state; you can encode userId if you like (URL-safe)
    auth.searchParams.set("state", userId);

    console.log("[wix-start]", rid, { client: WIX_CLIENT_ID.slice(0,6)+"…", redirect: WIX_REDIRECT_URI });
    return topRedirectHtml(auth.toString());
  } catch (e) {
    console.error("[wix-start]", rid, "error", e?.message || String(e));
    return new Response("wix_start_failed", { status: 500, headers: corsHeaders });
  }
});