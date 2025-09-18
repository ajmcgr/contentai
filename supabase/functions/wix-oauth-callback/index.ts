// Supabase Edge Function (Deno) — Wix OAuth callback
// Endpoint: https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback
// Requires Supabase secrets: WIX_APP_ID, WIX_APP_SECRET
// Optional: WIX_REDIRECT_URI (defaults to this function's URL)

const asHtml = (status: number, body: string) =>
  new Response(`<!doctype html><html><body><pre>${body}</pre></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "no-state";

  if (!code) {
    console.error("[Wix OAuth] Missing ?code", { query: url.search });
    return asHtml(400, "Callback failed: missing ?code. Check installer link & Wix app.");
  }

  const appId = Deno.env.get("WIX_APP_ID");
  const appSecret = Deno.env.get("WIX_APP_SECRET");
  const redirectUri =
    Deno.env.get("WIX_REDIRECT_URI") ??
    "https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback";

  if (!appId || !appSecret) {
    console.error("[Wix OAuth] Missing secrets", { hasAppId: !!appId, hasAppSecret: !!appSecret });
    return asHtml(500, "Callback failed: set WIX_APP_ID and WIX_APP_SECRET in Supabase secrets.");
  }

  try {
    // IMPORTANT: JSON body + application/json header (NOT x-www-form-urlencoded)
    const body = {
      grant_type: "authorization_code",
      code,
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri, // keep this matching Wix Dev Center exactly
    };

    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await tokenRes.text();
    let payload: any = raw;
    try { payload = JSON.parse(raw); } catch {}

    if (!tokenRes.ok) {
      console.error("[Wix OAuth] Token exchange failed", {
        status: tokenRes.status,
        payload,
      });
      // Show a simple page but keep details in logs
      return asHtml(
        502,
        `Callback failed: token exchange error ${tokenRes.status}. See Supabase logs.`
      );
    }

    // Expected fields from Wix
    const {
      access_token,
      refresh_token,
      instance_id,
      expires_in,
      scope,
      ...rest
    } = payload as Record<string, unknown>;

    if (!access_token || !refresh_token) {
      console.error("[Wix OAuth] Missing access/refresh tokens", payload);
      return asHtml(502, "Callback failed: missing tokens in response. See logs.");
    }

    console.log("[Wix OAuth] Success", {
      state,
      instance_id,
      has_access: !!access_token,
      has_refresh: !!refresh_token,
      expires_in,
      scope,
      extra: rest,
    });

    // TODO: persist tokens to your DB keyed by user/site (pseudo):
    // const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    // await supabase.from('wix_connections').upsert({
    //   user_id: <yourUserId>,
    //   instance_id,
    //   access_token,
    //   refresh_token,
    //   expires_at: Date.now() + Number(expires_in ?? 3600) * 1000,
    // });

    return asHtml(200, "Wix connected! You can close this tab.");
  } catch (err) {
    console.error("[Wix OAuth] Fatal error", err);
    return asHtml(500, "Callback failed: unexpected error. See logs.");
  }
});
