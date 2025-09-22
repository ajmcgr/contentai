const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const appId = Deno.env.get("WIX_APP_ID") || "";
  const secret = Deno.env.get("WIX_APP_SECRET") || "";
  const redirectUri = Deno.env.get("WIX_REDIRECT_URI") || "";
  if (!appId || !secret || !redirectUri) {
    return new Response(JSON.stringify({ error: "Missing WIX_* env (APP_ID/APP_SECRET/REDIRECT_URI)." }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) {
    return new Response(JSON.stringify({ error: "Missing uid query param" }),
      { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }

  // Add required scopes for site reading
  const scopes = [
    "wix-site.read",
    "wix-blog.read",
    "wix-blog.manage" // Keep existing scope for blog management
  ].join(' ');

  const u = new URL("https://www.wix.com/installer/install");
  u.searchParams.set("appId", appId);
  u.searchParams.set("redirectUrl", redirectUri);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("state", `uid:${uid}`); // ✅ embed user id

  return new Response(JSON.stringify({
    installerUrl: u.toString(),
    debug: { appId_tail: appId.slice(-4), redirectUri, state: `uid:${uid}` }
  }), { headers: { ...cors, "content-type": "application/json" } });
});