// Supabase Edge Function (Deno) — Wix OAuth start
// Returns the exact Wix installer URL using the *same* appId/redirect the callback will use.
// Set these in Edge Function env: WIX_APP_ID, WIX_APP_SECRET, WIX_REDIRECT_URI (optional)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[wix-oauth-start] Request received:', req.method, req.url);
    
    const appId =
      Deno.env.get("WIX_APP_ID") || Deno.env.get("WIX_CLIENT_ID") || "";
    const redirectUri =
      Deno.env.get("WIX_REDIRECT_URI") ||
      // default to your callback path on this project
      `https://${new URL(req.url).host}/functions/v1/wix-oauth-callback`;

    console.log('[wix-oauth-start] Environment check:', {
      hasAppId: !!appId,
      appIdTail: appId ? appId.slice(-4) : 'none',
      redirectUri
    });

    if (!appId) {
      console.error('[wix-oauth-start] Missing WIX_APP_ID');
      return new Response(
        JSON.stringify({ error: "Missing WIX_APP_ID in Edge Function env." }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }
    
    // Optional: assert secret exists too (helps avoid 400 at exchange time)
    const hasSecret = !!(
      Deno.env.get("WIX_APP_SECRET") || Deno.env.get("WIX_CLIENT_SECRET")
    );
    if (!hasSecret) {
      console.error('[wix-oauth-start] Missing WIX_APP_SECRET');
      return new Response(
        JSON.stringify({ error: "Missing WIX_APP_SECRET in Edge Function env." }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
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
    
    console.log('[wix-oauth-start] Success response:', body);
    
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error('[wix-oauth-start] Error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});