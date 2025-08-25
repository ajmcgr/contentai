-- Create config table for app-wide settings
CREATE TABLE public.config (
  id TEXT PRIMARY KEY,
  resend_api_key TEXT,
  email_from TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create policies - only service role can manage config
CREATE POLICY "Service role can manage all config" 
ON public.config 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Seed the global config row
INSERT INTO public.config (id, resend_api_key, email_from, updated_at)
VALUES (
  'global',
  're_Gnskd8ub_4MC2PdnKESgPwdwZTwoGStCJ',
  'support@trycontent.ai',
  now()
);

-- Create function to update config timestamp
CREATE OR REPLACE FUNCTION public.update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_config_updated_at
BEFORE UPDATE ON public.config
FOR EACH ROW
EXECUTE FUNCTION public.update_config_updated_at();