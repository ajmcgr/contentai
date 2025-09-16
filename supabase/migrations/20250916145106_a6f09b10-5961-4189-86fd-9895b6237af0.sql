-- Add missing Wix secrets to app_secrets table
INSERT INTO public.app_secrets (namespace, key, value) VALUES
('cms_integrations', 'WIX_CLIENT_ID', 'replace-with-your-wix-client-id'),
('cms_integrations', 'WIX_CLIENT_SECRET', 'replace-with-your-wix-client-secret'),
('cms_integrations', 'WIX_REDIRECT_URI', 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback')
ON CONFLICT (namespace, key) DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = now();