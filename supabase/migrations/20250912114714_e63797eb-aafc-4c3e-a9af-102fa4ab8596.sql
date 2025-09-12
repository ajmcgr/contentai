-- Create table for tracking monthly article limits
CREATE TABLE public.monthly_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_year DATE NOT NULL, -- First day of the month (YYYY-MM-01)
  articles_created INTEGER NOT NULL DEFAULT 0,
  max_articles INTEGER NOT NULL DEFAULT 50, -- Default free limit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per month
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own monthly usage" 
ON public.monthly_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly usage" 
ON public.monthly_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly usage" 
ON public.monthly_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all monthly usage" 
ON public.monthly_usage 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Add trigger for updated_at
CREATE TRIGGER update_monthly_usage_updated_at
BEFORE UPDATE ON public.monthly_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user can create articles
CREATE OR REPLACE FUNCTION public.can_create_article(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month_start DATE;
  usage_record RECORD;
  subscription_record RECORD;
  trial_record RECORD;
BEGIN
  -- Get first day of current month
  current_month_start := date_trunc('month', now())::date;
  
  -- Check if user has active paid subscription
  SELECT * INTO subscription_record 
  FROM public.subscriptions 
  WHERE user_id = user_uuid 
  AND status = 'active'
  AND plan_type != 'free';
  
  -- If paid subscriber, allow unlimited articles
  IF FOUND THEN
    RETURN true;
  END IF;
  
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
  
  -- For free users, check monthly usage
  SELECT * INTO usage_record 
  FROM public.monthly_usage 
  WHERE user_id = user_uuid 
  AND month_year = current_month_start;
  
  -- If no record exists, user can create articles (first of the month)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if under monthly limit
  RETURN usage_record.articles_created < usage_record.max_articles;
END;
$$;

-- Function to increment monthly usage
CREATE OR REPLACE FUNCTION public.increment_monthly_usage(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    max_limit := 999999; -- Unlimited for paid users
  ELSE
    max_limit := 50; -- Free limit
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
$$;