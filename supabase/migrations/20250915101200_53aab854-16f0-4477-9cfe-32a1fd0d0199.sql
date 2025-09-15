-- Create app_secrets table for unified secret management
CREATE TABLE IF NOT EXISTS public.app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,   -- e.g. 'cms_integrations'
  key text NOT NULL,         -- e.g. 'SHOPIFY_API_KEY'
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(namespace, key)
);

-- Create cms_installs table for per-user/per-connection installs
CREATE TABLE IF NOT EXISTS public.cms_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,              -- 'shopify' | 'wix'
  external_id text NOT NULL,           -- shop domain or wix siteId
  access_token text NOT NULL,
  refresh_token text,                  -- wix uses refresh; shopify may not
  scope text,
  extra jsonb DEFAULT '{}'::jsonb,     -- arbitrary (e.g., blogId, memberId)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, provider, external_id)
);

-- Enable RLS
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_installs ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_secrets (service role only)
CREATE POLICY "Service role can manage app secrets" ON public.app_secrets
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for cms_installs (users can manage their own)
CREATE POLICY "Users can view their own installs" ON public.cms_installs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own installs" ON public.cms_installs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installs" ON public.cms_installs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installs" ON public.cms_installs
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all installs
CREATE POLICY "Service role can manage all installs" ON public.cms_installs
  FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_secrets_updated_at
  BEFORE UPDATE ON public.app_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_installs_updated_at
  BEFORE UPDATE ON public.cms_installs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();