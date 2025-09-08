-- Update WordPress OAuth configuration with provided credentials
UPDATE config_integrations 
SET 
  wp_client_id = '123424',
  wp_client_secret = '8bh3QJZJdR2TZ8OZ4szGe0bvuQeY4nbhcw43Jw3nISbZEf6Yhe3AaF1zQBchphka',
  updated_at = now(),
  updated_by_user_id = 'b4aa13ed-d82e-49e4-94c1-0c3a90213424'
WHERE id = 'global';