-- Fix the search path issue for the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$;