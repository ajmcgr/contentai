-- Add wix_host column to wix_connections table
ALTER TABLE public.wix_connections ADD COLUMN wix_host text;