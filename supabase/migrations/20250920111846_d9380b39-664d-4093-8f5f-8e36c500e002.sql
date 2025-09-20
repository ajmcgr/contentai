-- Create shopify_connections table for simplified callback
CREATE TABLE IF NOT EXISTS public.shopify_connections (
  shop_domain text NOT NULL PRIMARY KEY,
  access_token text NOT NULL,
  scope text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage shopify connections" 
ON public.shopify_connections 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create webhook logs table for GDPR compliance logging
CREATE TABLE IF NOT EXISTS public.shopify_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain text,
  topic text,
  body jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on webhook logs
ALTER TABLE public.shopify_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage webhook logs
CREATE POLICY "Service role can manage webhook logs" 
ON public.shopify_webhook_logs 
FOR ALL 
USING (auth.role() = 'service_role');