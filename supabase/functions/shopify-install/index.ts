const CORS = { 
  "access-control-allow-origin": "*", 
  "access-control-allow-methods": "GET,OPTIONS", 
  "access-control-allow-headers": "*" 
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  
  const u = new URL(req.url);
  const shop = (u.searchParams.get("shop") || "").toLowerCase();
  
  if (!shop.endsWith(".myshopify.com")) {
    console.error("[Install] invalid shop", u.search);
    return new Response("Missing ?shop", { status: 400, headers: CORS });
  }
  
  const key = Deno.env.get("SHOPIFY_API_KEY")!;
  const red = encodeURIComponent(Deno.env.get("SHOPIFY_REDIRECT_URI")!);
  const scope = encodeURIComponent("read_content,write_content");
  const state = crypto.randomUUID();
  
  const auth = `https://${shop}/admin/oauth/authorize?client_id=${key}&scope=${scope}&redirect_uri=${red}&state=${encodeURIComponent(state)}`;
  
  console.log("[Install] 302 to authorize", { shop });
  
  return new Response(null, { status: 302, headers: { ...CORS, location: auth } });
});