import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const asHtml = (s:number, html:string) =>
  new Response(`<!doctype html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`, {
    status: s, headers: { "content-type": "text/html; charset=utf-8" }
  });

function parseUid(state: string | null) {
  const m = state && /^uid:(.+)$/.exec(state);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  if (!code) return asHtml(400, "<pre>Missing ?code</pre>");

  const appId = Deno.env.get("WIX_APP_ID") || Deno.env.get("WIX_CLIENT_ID") || "";
  const appSecret = Deno.env.get("WIX_APP_SECRET") || Deno.env.get("WIX_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("WIX_REDIRECT_URI") || `${url.origin}${url.pathname}`;
  if (!appId || !appSecret) return asHtml(500, "<pre>Missing WIX_APP_ID / WIX_APP_SECRET</pre>");

  const r = await fetch("https://www.wixapis.com/oauth/access", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
    }),
  });
  const raw = await r.text();
  let payload:any = raw; try { payload = JSON.parse(raw); } catch {}

  if (!r.ok) {
    console.error("[Wix OAuth] Exchange failed", { status: r.status, payload });
    return asHtml(400, `<pre>OAuth failed: ${r.status}</pre>`);
  }

  const { access_token, refresh_token, instance_id, expires_in, scope } = payload || {};
  if (!access_token || !refresh_token) return asHtml(502, "<pre>Missing tokens</pre>");

  // ✅ persist to DB under the real user id
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const userId = parseUid(state);
  if (SB_URL && SB_SVC) {
    try {
      const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });
      const expiresAt = new Date(Date.now() + Number(expires_in ?? 3600) * 1000).toISOString();
      const { error } = await supabase.from("wix_connections").upsert({
        user_id: userId,
        instance_id,
        access_token,
        refresh_token,
        scope,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "instance_id" });
      if (error) console.error("[Wix OAuth] DB upsert error", error);
      else console.log("[Wix OAuth] Saved", { user_id: userId, instance_id });
    } catch (e) {
      console.error("[Wix OAuth] DB persist fatal", e);
    }
  } else {
    console.warn("[Wix OAuth] Skipping DB persist (missing service role)");
  }

  // ✅ tell opener + close
  const msg = { provider: "wix", status: "connected", instance_id, state };
  const html = `
  <script>
    (function(){
      try { window.opener && window.opener.postMessage(${JSON.stringify(msg)}, "*"); } catch(e){}
      document.body.innerHTML = '<pre>Wix connected! You can close this tab.</pre>';
      setTimeout(function(){ window.close(); }, 300);
    })();
  </script>`;
  return asHtml(200, html);
});
