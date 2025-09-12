-- Update the increment_monthly_usage function to apply 50 article limit to all users
CREATE OR REPLACE FUNCTION public.increment_monthly_usage(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE;
  max_limit INTEGER;
BEGIN
  current_month_start := date_trunc('month', now())::date;
  
  -- Set limit to 50 for all users (paid and free)
  max_limit := 50;
  
  -- Insert or update monthly usage
  INSERT INTO public.monthly_usage (user_id, month_year, articles_created, max_articles)
  VALUES (user_uuid, current_month_start, 1, max_limit)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    articles_created = monthly_usage.articles_created + 1,
    updated_at = now();
  
  RETURN true;
END;
$function$;