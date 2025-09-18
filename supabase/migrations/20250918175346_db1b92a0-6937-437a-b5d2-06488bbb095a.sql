-- Add missing columns to wix_connections table for better Wix publishing support
ALTER TABLE wix_connections 
ADD COLUMN IF NOT EXISTS default_member_id TEXT,
ADD COLUMN IF NOT EXISTS wix_site_id TEXT;