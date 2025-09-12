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
$function$;