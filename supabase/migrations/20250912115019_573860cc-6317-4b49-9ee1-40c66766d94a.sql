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
$function$

-- Update the can_create_article function to use 50 limit for all users
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
  
  -- For all users (free and paid), check monthly usage with 50 limit
  SELECT * INTO usage_record 
  FROM public.monthly_usage 
  WHERE user_id = user_uuid 
  AND month_year = current_month_start;
  
  -- If no record exists, user can create articles (first of the month)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if under monthly limit (50 for all users)
  RETURN usage_record.articles_created < 50;
END;
$function$