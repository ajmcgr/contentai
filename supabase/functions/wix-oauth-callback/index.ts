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

  // --- Token exchange (verbatim JSON; Wix expects application/json) ---
  const reqBody = {
    grant_type: "authorization_code",
    code,
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
  };

  const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify(reqBody),
  });

  const wixReqId = tokenRes.headers.get("x-wix-request-id") || null;
  const raw = await tokenRes.text();
  let payload: any = raw;
  try { payload = JSON.parse(raw); } catch {}

  if (!tokenRes.ok) {
    console.error("[Wix OAuth] Token exchange failed", {
      status: tokenRes.status,
      wix_request_id: wixReqId,
      payload,
      reqBody: { ...reqBody, client_secret: "***" }, // don't log secret
      meta: {
        got_code: !!code,
        used_redirect_uri: redirectUri,
        app_id_tail: appId.slice(-6),
        state,
        query: url.search,
      },
    });

    const hint = `
<h3>Why 400 happens (common):</h3>
<ol>
  <li><b>Redirect URL mismatch</b> – In Wix Dev Center, OAuth Redirect URL must be
    <code>${redirectUri}</code> (exactly, https + path).</li>
  <li><b>Wrong App</b> – The installer's <code>appId</code> must equal your <code>WIX_APP_ID</code> (same environment).</li>
  <li><b>App not installed on this site</b> – install the app on the site you picked.</li>
  <li><b>App Secret mismatch</b> – ensure <code>WIX_APP_SECRET</code> matches the same app.</li>
</ol>`.trim();

    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"><title>Wix OAuth Error</title></head><body>
        <h1>OAuth failed: ${tokenRes.status}</h1>
        <p><b>x-wix-request-id:</b> ${wixReqId ?? "n/a"}</p>
        <p><b>Used redirect_uri:</b> <code>${redirectUri}</code></p>
        <p><b>AppId (tail):</b> …${appId.slice(-6)}</p>
        <p><b>State:</b> ${state}</p>
        <h3>Wix response</h3>
        <pre style="white-space:pre-wrap">${typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}</pre>
        ${hint}
      </body></html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const { access_token, refresh_token, instance_id, expires_in, scope } = payload || {};
  if (!access_token || !refresh_token) return asHtml(502, "<pre>Missing tokens</pre>");

// Attempt to resolve the Wix memberId and siteId associated with this access token (required by Blog API)
let memberId: string | null = null;
let siteId: string | null = null;
try {
  const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ token: access_token })
  });
  const triJson: any = await tri.json().catch(() => ({}));
  if (tri.ok) {
    memberId = triJson?.subjectId || null; // may or may not be a member id depending on subjectType
    siteId = triJson?.siteId || null;
    console.log('[Wix OAuth] token-info', { subjectType: triJson?.subjectType, subjectId: memberId, siteId });
  } else {
    console.warn('[Wix OAuth] token-info failed', { status: tri.status, body: triJson });
  }
} catch (e) {
  console.warn('[Wix OAuth] token-info error', e);
}

// Fallback: try listing members and take the first admin/owner (requires Members read permission)
if (!memberId) {
  try {
    const list = await fetch('https://www.wixapis.com/members/v1/members?paging.limit=1', {
      method: 'GET',
      headers: { 'accept': 'application/json', 'authorization': `Bearer ${access_token}` }
    });
    const listJson: any = await list.json().catch(() => ({}));
    if (list.ok) {
      const items = listJson?.members || listJson?.items || [];
      memberId = items?.[0]?.id || null;
      console.log('[Wix OAuth] members.list', { count: items?.length ?? 0, memberId });
    } else {
      console.warn('[Wix OAuth] members.list failed', { status: list.status, body: listJson });
    }
  } catch (e) {
    console.warn('[Wix OAuth] members.list error', e);
  }
}

// ✅ persist to DB under the real user id
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const userId = parseUid(state);
if (SB_URL && SB_SVC) {
  try {
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });
    // ✅ Upsert by user_id (one connection row per user)
    const { error: connErr } = await supabase
      .from("wix_connections")
      .upsert(
        {
          user_id: userId,
          instance_id,
          access_token,
          refresh_token,
          scope,
          default_member_id: memberId,
          wix_site_id: siteId,
          expires_at: new Date(Date.now() + Number(expires_in ?? 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (connErr) {
      console.error("[Wix OAuth] wix_connections upsert error", connErr);
    } else {
      console.log("[Wix OAuth] wix_connections saved/updated", { user_id: userId, instance_id });
    }

    // Detect which site/blog this token is bound to and store its host
    try {
      const headers: Record<string,string> = {
        authorization: `Bearer ${access_token}`,
        "content-type": "application/json",
      };
      if (instance_id) headers["wix-instance-id"] = instance_id;

      // Blog settings usually has a canonical URL
      const sRes = await fetch("https://www.wixapis.com/blog/v3/settings", { method: "GET", headers });
      const sTxt = await sRes.text();
      let s: any = sTxt; try { s = JSON.parse(sTxt); } catch {}
      const rawUrl = s?.blogUrl?.url || s?.siteUrl || "";
      const wix_host = (() => { try { return new URL(rawUrl).host; } catch { return null; } })();

      await supabase
        .from("wix_connections")
        .update({
          wix_host,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } catch (e) {
      console.log("[Wix OAuth] host-detect skipped", String(e));
    }

    // 🔹 Store (or update) a cms_installs record with memberId for easy retrieval later
    const { data: existingInstall } = await supabase
      .from('cms_installs')
      .select('id, extra')
      .eq('user_id', userId as any)
      .eq('provider', 'wix')
      .maybeSingle();

    const nextExtra = { ...(existingInstall?.extra || {}), scope, instanceId: instance_id, memberId } as any;

    if (existingInstall?.id) {
      const { error: updErr } = await supabase
        .from('cms_installs')
        .update({
          external_id: instance_id || (nextExtra.instanceId ?? 'unknown'),
          access_token,
          refresh_token,
          extra: nextExtra,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInstall.id);
      if (updErr) console.error('[Wix OAuth] cms_installs update error', updErr);
    } else {
      const { error: insErr } = await supabase
        .from('cms_installs')
        .insert({
          user_id: userId,
          provider: 'wix',
          external_id: instance_id || 'unknown',
          access_token,
          refresh_token,
          extra: nextExtra,
        });
      if (insErr) console.error('[Wix OAuth] cms_installs insert error', insErr);
    }
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
      try { 
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${JSON.stringify(msg)}, "*");
        }
      } catch(e){ console.log("postMessage failed:", e); }
      document.body.innerHTML = '<div style="text-align:center;padding:50px;font-family:sans-serif;"><h2 style="color:green;">✅ Wix Connected Successfully!</h2><p>This window will close automatically...</p></div>';
      setTimeout(function(){ 
        try { window.close(); } catch(e) { 
          document.body.innerHTML += '<p><a href="#" onclick="window.close()">Click here to close this window</a></p>';
        }
      }, 1000);
    })();
  </script>`;
  return asHtml(200, html);
});
