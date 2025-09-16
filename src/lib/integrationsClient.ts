const EDGE_BASE = 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1';

// Always navigate the TOP window (escapes iframes, avoids popup blockers)
function goTop(href: string) {
  if (!href) return;
  try {
    (window.top || window).location.href = href;
  } catch {
    window.location.href = href;
  }
}

export function startShopifyOAuth({ shop, userId }: { shop: string; userId: string }) {
  if (!shop || !shop.endsWith('.myshopify.com')) {
    throw new Error('Enter full shop domain like mystore.myshopify.com');
  }
  const url = `${EDGE_BASE}/shopify-oauth-start?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(userId)}`;
  goTop(url);
}

export function startWixOAuth({ userId }: { userId: string }) {
  const url = `${EDGE_BASE}/wix-oauth-start?userId=${encodeURIComponent(userId)}`;
  goTop(url);
}

import { supabase } from '@/integrations/supabase/client';

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