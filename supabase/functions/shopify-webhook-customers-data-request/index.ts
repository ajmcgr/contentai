import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifyShopifyWebhook(req: Request, secret: string) {
  const sig = req.headers.get("x-shopify-hmac-sha256") || "";
  const raw = new Uint8Array(await req.arrayBuffer());
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, raw);
  const digest = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return digest === sig;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("SHOPIFY_API_SECRET")!;
  const ok = await verifyShopifyWebhook(req, secret);
  
  if (!ok) { 
    console.error("[WH] bad HMAC"); 
    return new Response("unauthorized", { status: 401 }); 
  }
  
  const txt = await req.text(); 
  let body: any = {}; 
  try { body = JSON.parse(txt); } catch {}
  
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  
  await sb.from("shopify_webhook_logs").insert({
    shop_domain: req.headers.get("x-shopify-shop-domain"),
    topic: req.headers.get("x-shopify-topic"),
    body
  });
  
  console.log("[WH] customers/data_request logged", { shop: req.headers.get("x-shopify-shop-domain") });
  
  return new Response("ok");
});