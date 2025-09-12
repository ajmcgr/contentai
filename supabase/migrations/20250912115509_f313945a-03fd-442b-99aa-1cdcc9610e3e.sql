-- Update functions to limit free users to 3 articles, paid users to 50
CREATE OR REPLACE FUNCTION public.increment_monthly_usage(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE;
  subscription_record RECORD;
  max_limit INTEGER;
BEGIN
  current_month_start := date_trunc('month', now())::date;
  
  -- Check subscription status to determine limit
  SELECT * INTO subscription_record 
  FROM public.subscriptions 
  WHERE user_id = user_uuid;
  
  -- Set appropriate limit based on subscription
  IF subscription_record.plan_type = 'pro' AND subscription_record.status = 'active' THEN
    max_limit := 50; -- Pro users get 50 articles
  ELSE
    max_limit := 3; -- Free users get 3 articles
  END IF;
  
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