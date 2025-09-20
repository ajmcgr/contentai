import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function htmlRedirect(target: string, msg = "Redirecting…", status = 200) {
  const h = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui">
  <p>${msg}</p><script>(function(u){try{if(window.top)window.top.location.href=u;else location.href=u;}catch(e){location.href=u;}})(${JSON.stringify(target)})</script></body>`;
  return new Response(h, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const shop = (url.searchParams.get("shop") || "").toLowerCase();
  const code = url.searchParams.get("code") || "";
  
  if (!shop || !code) { 
    console.error("[CB] missing params", url.search); 
    return htmlRedirect(Deno.env.get("APP_DASH_URL")! + "?auth=error", "OAuth failed", 400); 
  }

  const key = Deno.env.get("SHOPIFY_API_KEY")!, sec = Deno.env.get("SHOPIFY_API_SECRET")!;
  
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST", 
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ client_id: key, client_secret: sec, code })
  });
  
  const t = await r.text(); 
  let js: any = t; 
  try { js = JSON.parse(t); } catch {}
  
  if (!r.ok || !js?.access_token) { 
    console.error("[CB] token failed", { shop, status: r.status, js }); 
    return htmlRedirect(Deno.env.get("APP_DASH_URL")! + "?auth=error", "Auth failed", 400); 
  }

  const token = js.access_token as string;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  
  await sb.from("shopify_connections").upsert({ 
    shop_domain: shop, 
    access_token: token, 
    scope: js.scope || null, 
    updated_at: new Date().toISOString() 
  }, { onConflict: "shop_domain" });
  
  console.log("[CB] connected", { shop, scope: js.scope });

  // Register mandatory GDPR webhooks (idempotent)
  const hooks = ["customers/data_request", "customers/redact", "shop/redact"];
  const list = await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, { 
    headers: { "x-shopify-access-token": token, "accept": "application/json" } 
  }).then(r => r.json()).catch(() => ({ webhooks: [] }));
  
  const existing = new Set((list?.webhooks || []).map((w: any) => w.topic));
  
  for (const topic of hooks) {
    if (existing.has(topic)) continue;
    
    const addr = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-webhook-${topic.replace("/", "-")}`;
    const wr = await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
      method: "POST",
      headers: { "x-shopify-access-token": token, "content-type": "application/json" },
      body: JSON.stringify({ webhook: { topic, address: addr, format: "json" } })
    });
    
    if (!wr.ok) { 
      const p = await wr.text(); 
      console.error("[CB] webhook reg failed", { shop, topic, status: wr.status, p }); 
    }
  }

  const dash = Deno.env.get("APP_DASH_URL")!;
  return htmlRedirect(`${dash}?shop=${encodeURIComponent(shop)}`, "Authenticated — redirecting…", 200);
});