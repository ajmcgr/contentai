import { supabase } from '@/integrations/supabase/client';

export async function getShopifySecrets() {
  const { data, error } = await supabase
    .from("app_secrets")
    .select("key,value")
    .eq("namespace", "cms_integrations");

  if (error) throw new Error("Failed to fetch Shopify secrets: " + error.message);

  const map = Object.fromEntries((data || []).map(r => [r.key, String(r.value).trim()]));

  const required = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SHOPIFY_APP_URL",
    "SHOPIFY_REDIRECT_URI",
    "SHOPIFY_SCOPES"
  ];
  for (const k of required) {
    if (!map[k]) throw new Error(`Missing Shopify secret: ${k}`);
  }

  return {
    apiKey: map.SHOPIFY_API_KEY,
    apiSecret: map.SHOPIFY_API_SECRET,
    appUrl: map.SHOPIFY_APP_URL,
    redirectUri: map.SHOPIFY_REDIRECT_URI,
    scopes: map.SHOPIFY_SCOPES
  };
}