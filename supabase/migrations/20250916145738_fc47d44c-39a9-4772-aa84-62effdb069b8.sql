-- Update Wix secrets with exact values
INSERT INTO public.app_secrets (namespace, key, value) VALUES
('cms_integrations', 'WIX_CLIENT_ID', 'f769a0b6-320b-486d-aa51-e465e3a7817e'),
('cms_integrations', 'WIX_CLIENT_SECRET', '6cf234df-2836-4876-b005-6466b9a19555'),
('cms_integrations', 'WIX_PUBLIC_KEY', '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuKXFmfcCS7vKikMhJgwp
TsccPCj5zDI45MxQX/KhZrzE1yF+TPvVf1vDpvB0c7JRsf1rAcyShPbVxeHRdGke
jOLyvXD0xRCDde876f2F2fLx8MvD+yMW4P37UaoiP/+7J842gGlvi8JAFzyNVGPf
HgA6ir1y5DhwvcBX6JzfGM/xhId2/adr4HEubBZXoY+3HuEdhiwn8oKn2EEaANRa
MFK5NnVBfoVpTqnSBglsyNKR0ZtHygjQadfyW1F5I62pliF7tqJH4Ly350VyZSaf
4gHXPJQnPYgoK6sd+ctrQ0QBCsYZz/XcPVsX7lfAg7z/5O6prmiy8U8OGjF4rY35
3QIDAQAB
-----END PUBLIC KEY-----'),
('cms_integrations', 'WIX_REDIRECT_URI', 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback')
ON CONFLICT (namespace, key) DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = now();