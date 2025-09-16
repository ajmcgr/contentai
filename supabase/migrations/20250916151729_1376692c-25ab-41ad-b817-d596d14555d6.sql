-- Ensure Wix secrets are set exactly (idempotent upsert by namespace+key)
INSERT INTO public.app_secrets (namespace, key, value)
VALUES
  ('cms_integrations','WIX_CLIENT_ID','f769a0b6-320b-486d-aa51-e465e3a7817e'),
  ('cms_integrations','WIX_CLIENT_SECRET','6cf234df-2836-4876-b005-6466b9a19555'),
  ('cms_integrations','WIX_REDIRECT_URI','https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback')
ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();