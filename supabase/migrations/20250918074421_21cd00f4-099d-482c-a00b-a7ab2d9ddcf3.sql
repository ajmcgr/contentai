-- Relax wix_connections.instance_id NOT NULL to allow missing instance ids from Wix payloads
ALTER TABLE public.wix_connections ALTER COLUMN instance_id DROP NOT NULL;

-- Ensure we can upsert by user when instance_id is absent
-- Create a unique constraint on user_id to allow onConflict('user_id')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wix_connections_user_id_key'
  ) THEN
    ALTER TABLE public.wix_connections ADD CONSTRAINT wix_connections_user_id_key UNIQUE (user_id);
  END IF;
END$$;