// Supabase Edge Function (Deno) — Wix OAuth start
// Returns the exact Wix installer URL using the *same* appId/redirect the callback will use.
// Set these in Edge Function env: WIX_APP_ID, WIX_APP_SECRET, WIX_REDIRECT_URI (optional)

Deno.serve(async (req) => {
  try {
    const appId =
      Deno.env.get("WIX_APP_ID") || Deno.env.get("WIX_CLIENT_ID") || "";
    const redirectUri =
      Deno.env.get("WIX_REDIRECT_URI") ||
      // default to your callback path on this project
      `https://${new URL(req.url).host}/functions/v1/wix-oauth-callback`;

    if (!appId) {
      return new Response(
        JSON.stringify({ error: "Missing WIX_APP_ID in Edge Function env." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    // Optional: assert secret exists too (helps avoid 400 at exchange time)
    const hasSecret = !!(
      Deno.env.get("WIX_APP_SECRET") || Deno.env.get("WIX_CLIENT_SECRET")
    );
    if (!hasSecret) {
      return new Response(
        JSON.stringify({ error: "Missing WIX_APP_SECRET in Edge Function env." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const u = new URL("https://www.wix.com/installer/install");
    u.searchParams.set("appId", appId);
    u.searchParams.set("redirectUrl", redirectUri);

    // Optional: carry a user id in state so callback can associate tokens
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid") || "";
    const state = uid ? `uid:${uid}` : crypto.randomUUID();
    u.searchParams.set("state", state);

    const body = {
      installerUrl: u.toString(),
      debug: {
        appId_tail: appId.slice(-4),
        redirectUri,
        state,
      },
    };
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});