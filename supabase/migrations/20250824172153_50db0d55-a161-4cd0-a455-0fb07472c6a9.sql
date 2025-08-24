-- Add unique constraint for cms_connections to prevent duplicate connections
ALTER TABLE public.cms_connections 
ADD CONSTRAINT unique_user_platform_site 
UNIQUE (user_id, platform, site_url);