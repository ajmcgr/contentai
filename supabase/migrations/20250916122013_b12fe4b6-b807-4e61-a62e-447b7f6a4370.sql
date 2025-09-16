-- Upsert Shopify secrets into app_secrets
INSERT INTO public.app_secrets (namespace, key, value) VALUES
('cms_integrations', 'SHOPIFY_API_KEY', '74ad66a74f5824c81343ef70872d0513'),
('cms_integrations', 'SHOPIFY_API_SECRET', '1e89f0e898151f75900d34dd1c66b43d'),
('cms_integrations', 'SHOPIFY_APP_URL', 'https://hmrzmafwvhifjhsoizil.supabase.co'),
('cms_integrations', 'SHOPIFY_REDIRECT_URI', 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-oauth-callback'),
('cms_integrations', 'SHOPIFY_SCOPES', 'read_content,write_content')
ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();