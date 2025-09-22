-- Add wix_host and wix_site_url columns if they don't exist
ALTER TABLE public.wix_connections
  ADD COLUMN IF NOT EXISTS wix_host text,
  ADD COLUMN IF NOT EXISTS wix_site_url text;