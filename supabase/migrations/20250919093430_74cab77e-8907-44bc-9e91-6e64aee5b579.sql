-- Fix function security by setting search_path
ALTER FUNCTION get_shopify_install_debug(uuid, text) SET search_path = public;