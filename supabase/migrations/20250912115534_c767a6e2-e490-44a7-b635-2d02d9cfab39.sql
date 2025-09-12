-- Update can_create_article function to use different limits for free vs paid users
CREATE OR REPLACE FUNCTION public.can_create_article(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE;
  usage_record RECORD;
  trial_record RECORD;
  subscription_record RECORD;
  user_limit INTEGER;
BEGIN
  -- Get first day of current month
  current_month_start := date_trunc('month', now())::date;
  
  -- Check if user is in active trial
  SELECT * INTO trial_record 
  FROM public.user_trials 
  WHERE user_id = user_uuid 
  AND is_trial_active = true
  AND trial_end_date > now()
  AND articles_created < max_trial_articles;
  
  -- If in trial, use trial limits
  IF FOUND THEN
    RETURN true;
  END IF;
  
  -- Check subscription status to determine limit
  SELECT * INTO subscription_record 
  FROM public.subscriptions 
  WHERE user_id = user_uuid;
  
  -- Set appropriate limit based on subscription
  IF subscription_record.plan_type = 'pro' AND subscription_record.status = 'active' THEN
    user_limit := 50; -- Pro users get 50 articles
  ELSE
    user_limit := 3; -- Free users get 3 articles
  END IF;
  
  -- Check monthly usage
  SELECT * INTO usage_record 
  FROM public.monthly_usage 
  WHERE user_id = user_uuid 
  AND month_year = current_month_start;
  
  -- If no record exists, user can create articles (first of the month)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if under the user's specific limit
  RETURN usage_record.articles_created < user_limit;
END;
$function$;