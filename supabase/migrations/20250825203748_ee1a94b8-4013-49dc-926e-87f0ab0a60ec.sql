-- Update the redirect URI in config_integrations to use the correct endpoint
UPDATE config_integrations 
SET wp_redirect_uri = 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wp-oauth-callback'
WHERE id = 'global';