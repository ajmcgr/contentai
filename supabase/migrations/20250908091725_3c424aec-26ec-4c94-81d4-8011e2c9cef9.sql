-- Create topics table for content organization
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  category TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own topics" 
ON public.topics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own topics" 
ON public.topics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics" 
ON public.topics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topics" 
ON public.topics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add topic_id to articles table
ALTER TABLE public.articles 
ADD COLUMN topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;