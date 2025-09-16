const EDGE_BASE = 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1';

// Always navigate the TOP window. If inside an iframe, open a new tab to avoid frame restrictions
function goTop(href: string) {
  if (!href) return;
  try {
    // If we are inside an iframe, prefer opening a new tab (Shopify blocks being framed)
    if (window.top && window.top !== window) {
      const w = window.open(href, '_blank', 'noopener,noreferrer');
      if (!w) {
        // Fallback: attempt top navigation
        (window.top as Window).location.href = href;
      }
      return;
    }
    // Not in an iframe: regular navigation
    window.location.href = href;
  } catch {
    // Last resort
    const w = window.open(href, '_blank', 'noopener,noreferrer');
    if (!w) window.location.href = href;
  }
}

export function startShopifyOAuth({ shop, userId }: { shop: string; userId: string }) {
  if (!shop || !shop.endsWith('.myshopify.com')) {
    throw new Error('Enter full shop domain like mystore.myshopify.com');
  }
  const url = `${EDGE_BASE}/shopify-oauth-start?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(userId)}`;
  console.log('🟡 Constructed OAuth URL:', url);
  console.log('🟡 Attempting navigation...');
  goTop(url);
  console.log('🟡 Navigation called');
}

export function startWixOAuth({ userId }: { userId: string }) {
  const url = `${EDGE_BASE}/wix-oauth-start?userId=${encodeURIComponent(userId)}`;
  console.log('🔵 Starting Wix OAuth with userId:', userId);
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