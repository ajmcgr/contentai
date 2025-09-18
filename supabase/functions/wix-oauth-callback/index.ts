// deno-lint-ignore no-explicit-any
const json = (status: number, body: any, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

const html = (status: number, body: string) =>
  new Response(`<!doctype html><html><body><pre>${body}</pre></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      console.error("[Wix OAuth] Missing ?code");
      return html(400, "Callback failed: missing ?code. Check installer URL and Wix Dev Center.");
    }

    // (Optional) If you stored expected state in a cookie/session, validate here.

    // Secrets
    const appId = Deno.env.get("WIX_CLIENT_ID");
    const appSecret = Deno.env.get("WIX_CLIENT_SECRET");
    const redirectUri = Deno.env.get("WIX_REDIRECT_URI");
    if (!appId || !appSecret || !redirectUri) {
      console.error("[Wix OAuth] Missing secrets", { hasAppId: !!appId, hasAppSecret: !!appSecret, hasRedirect: !!redirectUri });
      return html(500, "Callback failed: missing WIX_CLIENT_ID, WIX_CLIENT_SECRET or WIX_REDIRECT_URI in Supabase secrets.");
    }

    // Exchange the authorization code for tokens
    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri
      }),
    });

    const text = await tokenRes.text();
    let payload: any = null;
    try { payload = JSON.parse(text); } catch {
      console.error("[Wix OAuth] Non-JSON token response:", text);
      return html(502, "Callback failed: token endpoint returned non-JSON. See logs.");
    }

    if (!tokenRes.ok) {
      console.error("[Wix OAuth] Token exchange failed", { status: tokenRes.status, payload });
      return html(502, `Callback failed: token exchange error ${tokenRes.status}. See logs.`);
    }

    const { access_token, refresh_token, instance_id, expires_in, ...rest } = payload;

    if (!access_token || !refresh_token) {
      console.error("[Wix OAuth] Missing tokens in response", payload);
      return html(502, "Callback failed: missing access/refresh tokens. See logs.");
    }

    // TODO: persist tokens to your DB (by user/site). Example with Supabase (pseudo):
    // const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // await supabase.from('wix_connections').upsert({
    //   user_id: <currentUserId>,
    //   instance_id,
    //   access_token,
    //   refresh_token,
    //   expires_at: Date.now() + (expires_in ?? 3600) * 1000,
    // });

    console.log("[Wix OAuth] Success", { instance_id, has_access: !!access_token, has_refresh: !!refresh_token, extra: rest });

    // Simple success page
    return html(200, "Wix connected! You can close this tab.");
  } catch (err) {
    console.error("[Wix OAuth] Fatal error", err);
    return html(500, "Callback failed: unexpected error. See logs.");
  }
});