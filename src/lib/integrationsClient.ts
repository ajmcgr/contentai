import { supabase } from '@/integrations/supabase/client';

export async function startShopifyOAuth(shop: string) {
  if (!shop || !shop.endsWith('.myshopify.com')) {
    throw new Error('Enter full shop domain like mystore.myshopify.com');
  }

  console.log('[Integrations] Shopify connect clicked', { shop });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Build direct function URL with query params and redirect the browser
  const fnUrl = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-oauth-start?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(session.user.id)}`;

  console.log('[Integrations] Redirecting to Shopify OAuth start', { fnUrl });
  window.location.assign(fnUrl);
}

export async function startWixOAuth() {
  console.log('[Integrations] Wix connect clicked');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Build direct function URL with query params and redirect the browser
  const fnUrl = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-start?userId=${encodeURIComponent(session.user.id)}`;

  console.log('[Integrations] Redirecting to Wix OAuth start', { fnUrl });
  window.location.assign(fnUrl);
}

export async function getIntegrationStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('integration-status', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to get status');
  }

  return response.data;
}