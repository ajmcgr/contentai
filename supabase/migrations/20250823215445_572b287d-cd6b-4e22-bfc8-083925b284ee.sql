-- Create user_trials table to track free trial periods
CREATE TABLE public.user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  articles_created INTEGER NOT NULL DEFAULT 0,
  max_trial_articles INTEGER NOT NULL DEFAULT 3,
  is_trial_active BOOLEAN NOT NULL DEFAULT true,
  has_upgraded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own trial status" 
ON public.user_trials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trial" 
ON public.user_trials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trial" 
ON public.user_trials 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_trials_updated_at
BEFORE UPDATE ON public.user_trials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user is in trial period
CREATE OR REPLACE FUNCTION public.is_trial_active(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to increment article count for trial users
CREATE OR REPLACE FUNCTION public.increment_trial_articles(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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