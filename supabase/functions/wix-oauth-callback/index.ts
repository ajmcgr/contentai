// Supabase Edge Function (Deno) — Wix OAuth callback
// Endpoint: https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback
// Requires Supabase secrets: WIX_APP_ID, WIX_APP_SECRET
// Optional: WIX_REDIRECT_URI (defaults to this function's URL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const asHtml = (s: number, msg: string) =>
  new Response(`<!doctype html><html><body><pre>${msg}</pre></body></html>`, {
    status: s, headers: { "content-type": "text/html; charset=utf-8" },
  });

function parseUid(state: string | null){ 
  const m = state && /^uid:(.+)$/.exec(state || ""); 
  return m ? m[1] : null; 
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "no-state";
  if (!code) return asHtml(400, "Callback failed: missing ?code");

  const appId = Deno.env.get("WIX_APP_ID") || Deno.env.get("WIX_CLIENT_ID") || "";
  const appSecret = Deno.env.get("WIX_APP_SECRET") || Deno.env.get("WIX_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("WIX_REDIRECT_URI") || `${url.origin}${url.pathname}`;
  if (!appId || !appSecret) return asHtml(500, "Callback failed: missing WIX_APP_ID / WIX_APP_SECRET (Edge env).");

  console.log("[Wix OAuth] Will exchange", {
    appId_tail: appId.slice(-4),
    redirect_uri: redirectUri,
    state,
  });

  const res = await fetch("https://www.wixapis.com/oauth/access", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
    }),
  });

  const raw = await res.text();
  let payload: any = raw; try { payload = JSON.parse(raw); } catch {}

  if (!res.ok) {
    console.error("[Wix OAuth] Token exchange failed", {
      status: res.status, payload,
      hint: "Installer appId & redirect must match WIX_APP_ID/WIX_REDIRECT_URI (same Wix app & environment).",
    });
    return asHtml(400, "Callback failed: unauthorized_client. See logs for details.");
  }

  const { access_token, refresh_token, instance_id, expires_in } = payload || {};
  if (!access_token || !refresh_token) return asHtml(502, "Callback failed: missing tokens in response.");

  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (SB_URL && SB_SVC) {
    try {
      const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });
      const userId = parseUid(state);
      const expiresAt = new Date(Date.now() + Number(expires_in ?? 3600) * 1000).toISOString();
      const { error } = await supabase.from("wix_connections").upsert({
        user_id: userId, instance_id, access_token, refresh_token,
        expires_at: expiresAt, updated_at: new Date().toISOString(),
      }, { onConflict: "instance_id" });
      if (error) console.error("[Wix OAuth] DB upsert error", error);
    } catch (e) { console.error("[Wix OAuth] DB persist fatal", e); }
  }

  console.log("[Wix OAuth] Success", { instance_id, has_access: !!access_token, has_refresh: !!refresh_token });
  return asHtml(200, "Wix connected! You can close this tab.");
});
