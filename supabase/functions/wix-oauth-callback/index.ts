// Supabase Edge Function (Deno) — Wix OAuth callback
// Endpoint: https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback
// Requires Supabase secrets: WIX_APP_ID, WIX_APP_SECRET
// Optional: WIX_REDIRECT_URI (defaults to this function's URL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const asHtml = (status: number, html: string) =>
  new Response(`<!doctype html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

function parseUid(state: string | null) {
  const m = state && /^uid:(.+)$/.exec(state);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "no-state";
  const expectedRedirect = Deno.env.get("WIX_REDIRECT_URI") ?? `${url.origin}${url.pathname}`;

  if (!code) return asHtml(400, `<pre>Missing ?code</pre>`);

  const appId = Deno.env.get("WIX_APP_ID") || Deno.env.get("WIX_CLIENT_ID") || "";
  const appSecret = Deno.env.get("WIX_APP_SECRET") || Deno.env.get("WIX_CLIENT_SECRET") || "";
  if (!appId || !appSecret) return asHtml(500, `<pre>Missing WIX_APP_ID / WIX_APP_SECRET</pre>`);

  // Exchange code → tokens (JSON, not form-encoded)
  const res = await fetch("https://www.wixapis.com/oauth/access", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: expectedRedirect,
    }),
  });

  const raw = await res.text();
  let payload: any = raw; try { payload = JSON.parse(raw); } catch {}
  if (!res.ok) {
    console.error("[Wix OAuth] Token exchange failed", { status: res.status, payload });
    return asHtml(400, `<pre>OAuth failed: ${res.status}</pre>`);
  }

  const { access_token, refresh_token, instance_id, expires_in, scope } = payload || {};
  if (!access_token || !refresh_token) {
    console.error("[Wix OAuth] Missing tokens", payload);
    return asHtml(502, `<pre>Missing tokens</pre>`);
  }

  // Optional: store in Supabase
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const userId = parseUid(state);
  if (SB_URL && SB_SVC) {
    try {
      const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });
      const expiresAt = new Date(Date.now() + Number(expires_in ?? 3600) * 1000).toISOString();
      const { error } = await supabase.from("wix_connections").upsert({
        user_id: userId,
        instance_id: instance_id || 'wix-default',
        access_token,
        refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) console.error("[Wix OAuth] DB upsert error", error);
    } catch (e) {
      console.error("[Wix OAuth] DB persist fatal", e);
    }
  }

  // ✅ Notify opener and close
  const msg = {
    provider: "wix",
    status: "connected",
    instance_id,
    state,
  };
  const script = `
    <script>
      (function(){
        try {
          var msg = ${JSON.stringify(msg)};
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(msg, "*");
          }
        } catch (e) {}
        document.body.innerHTML = '<pre>Wix connected! You can close this tab.</pre>';
        setTimeout(function(){ window.close(); }, 300);
      })();
    </script>
  `;
  return asHtml(200, script);
});
