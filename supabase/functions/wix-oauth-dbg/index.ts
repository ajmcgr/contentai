import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const { data } = await sb.from("app_secrets").select("key,value").eq("namespace","cms_integrations");
  const map = Object.fromEntries((data||[]).map((r:any)=>[r.key, String(r.value||"").trim()]));
  const appId = map.WIX_CLIENT_ID;
  const redirect = map.WIX_REDIRECT_URI;

  const installer = new URL("https://www.wix.com/installer/install");
  installer.searchParams.set("appId", appId);
  installer.searchParams.set("redirectUrl", redirect);
  installer.searchParams.set("state", "dbg");

  return new Response(JSON.stringify({
    appId,
    redirectUri: redirect,
    installerUrl: installer.toString()
  }, null, 2), { status: 200, headers: { "content-type":"application/json" }});
});