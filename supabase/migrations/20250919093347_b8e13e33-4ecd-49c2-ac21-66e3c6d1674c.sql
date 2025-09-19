-- Create a simple diagnostic edge function to check Shopify installation status
CREATE OR REPLACE FUNCTION get_shopify_install_debug(user_uuid uuid, shop_domain text)
RETURNS json AS $$
DECLARE
  install_record RECORD;
  result json;
BEGIN
  -- Look for install record
  SELECT * INTO install_record 
  FROM cms_installs 
  WHERE user_id = user_uuid 
  AND provider = 'shopify' 
  AND external_id = shop_domain;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'status', 'no_install',
      'message', 'No Shopify installation found for this user and shop',
      'user_id', user_uuid,
      'shop', shop_domain
    );
  ELSE
    result := json_build_object(
      'status', 'found',
      'install_id', install_record.id,
      'created_at', install_record.created_at,
      'scope', install_record.scope,
      'has_access_token', (install_record.access_token IS NOT NULL),
      'token_length', CASE WHEN install_record.access_token IS NULL THEN 0 ELSE length(install_record.access_token) END
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;