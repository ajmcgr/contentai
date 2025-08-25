-- Create updated config_integrations table structure
DROP TABLE IF EXISTS config_integrations CASCADE;

CREATE TABLE config_integrations (
  id text PRIMARY KEY DEFAULT 'global',
  wp_client_id text,
  wp_client_secret text,
  wp_redirect_uri text,
  updated_by_user_id text,
  updated_at timestamptz DEFAULT now()
);

-- Seed the global config row
INSERT INTO config_integrations (
  id,
  wp_client_id,
  wp_client_secret,
  wp_redirect_uri,
  updated_by_user_id,
  updated_at
) VALUES (
  'global',
  '',
  '',
  'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/cms-integration/oauth-callback',
  null,
  now()
);

-- Create wp_tokens table
CREATE TABLE wp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  access_token text NOT NULL,
  scope text,
  blog_id text,
  blog_url text,
  created_at timestamptz DEFAULT now()
);

-- Create oauth_states table
CREATE TABLE oauth_states (
  state text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE config_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for config_integrations (admin only)
CREATE POLICY "Service role can manage config_integrations"
  ON config_integrations
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for wp_tokens (users can only see their own)
CREATE POLICY "Users can view their own tokens"
  ON wp_tokens
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON wp_tokens
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own tokens"
  ON wp_tokens
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON wp_tokens
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS policies for oauth_states (users can only manage their own)
CREATE POLICY "Users can view their own oauth states"
  ON oauth_states
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own oauth states"
  ON oauth_states
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own oauth states"
  ON oauth_states
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Function to clean up expired oauth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$;