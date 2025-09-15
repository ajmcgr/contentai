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

  const response = await supabase.functions.invoke('shopify-oauth-start', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'OAuth start failed');
  }

  const { authUrl } = response.data;
  
  // Direct redirect - no fetch, no popup
  window.location.assign(authUrl);
}

export async function startWixOAuth() {
  console.log('[Integrations] Wix connect clicked');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('wix-oauth-start', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'OAuth start failed');
  }

  const { authUrl } = response.data;
  
  // Direct redirect - no fetch, no popup  
  window.location.assign(authUrl);
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