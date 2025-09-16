-- Create app_secrets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(namespace, key)
);

-- Enable RLS
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions)
CREATE POLICY "Service role can manage app secrets" ON public.app_secrets
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert Shopify secrets
INSERT INTO public.app_secrets (namespace, key, value) VALUES
('cms_integrations', 'SHOPIFY_API_KEY', '74ad66a74f5824c81343ef70872d0513'),
('cms_integrations', 'SHOPIFY_API_SECRET', '1e89f0e898151f75900d34dd1c66b43d'),
('cms_integrations', 'SHOPIFY_APP_URL', 'https://hmrzmafwvhifjhsoizil.supabase.co'),
('cms_integrations', 'SHOPIFY_REDIRECT_URI', 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-oauth-callback'),
('cms_integrations', 'SHOPIFY_SCOPES', 'read_content,write_content')
ON CONFLICT (namespace, key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Create trigger for updated_at
CREATE TRIGGER update_app_secrets_updated_at
  BEFORE UPDATE ON public.app_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();