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

// Attempt to resolve the Wix memberId associated with this access token (required by Blog API)
let memberId: string | null = null;
try {
  const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ token: access_token })
  });
  const triJson: any = await tri.json().catch(() => ({}));
  if (tri.ok) {
    memberId = triJson?.subjectId || null; // subjectId corresponds to the member/site subject
    console.log('[Wix OAuth] token-info', { subjectType: triJson?.subjectType, subjectId: memberId, siteId: triJson?.siteId });
  } else {
    console.warn('[Wix OAuth] token-info failed', { status: tri.status, body: triJson });
  }
} catch (e) {
  console.warn('[Wix OAuth] token-info error', e);
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
