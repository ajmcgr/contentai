-- Fix function search path security issues by setting search_path parameter
-- Update the existing functions to include proper search_path

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER 
 SET search_path = public
AS $function$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$function$;

-- Fix update_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix is_trial_active function
CREATE OR REPLACE FUNCTION public.is_trial_active(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_record RECORD;
BEGIN
  SELECT * INTO trial_record 
  FROM public.user_trials 
  WHERE user_id = user_uuid 
  AND is_trial_active = true
  AND trial_end_date > now()
  AND articles_created < max_trial_articles;
  
  RETURN FOUND;
END;
$$;

-- Fix increment_trial_articles function
CREATE OR REPLACE FUNCTION public.increment_trial_articles(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_trials 
  SET articles_created = articles_created + 1,
      updated_at = now()
  WHERE user_id = user_uuid 
  AND is_trial_active = true;
  
  RETURN FOUND;
END;
$$;