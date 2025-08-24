-- Create brand_settings table to store user brand information
CREATE TABLE public.brand_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT,
  description TEXT,
  target_audience TEXT,
  industry TEXT,
  tone_of_voice TEXT,
  website_url TEXT,
  language TEXT DEFAULT 'en-US',
  tags TEXT[],
  internal_links TEXT[],
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_settings
CREATE POLICY "Users can view their own brand settings" 
ON public.brand_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand settings" 
ON public.brand_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand settings" 
ON public.brand_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand settings" 
ON public.brand_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();