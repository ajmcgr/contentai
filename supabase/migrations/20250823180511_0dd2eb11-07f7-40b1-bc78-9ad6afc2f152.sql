-- Create content generation system tables

-- Articles table to store generated content
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[],
  target_keyword TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  word_count INTEGER,
  readability_score FLOAT,
  seo_score FLOAT,
  featured_image_url TEXT,
  slug TEXT UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- RLS policies for articles
CREATE POLICY "Users can view their own articles" ON public.articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own articles" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles" ON public.articles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles" ON public.articles
  FOR DELETE USING (auth.uid() = user_id);

-- CMS connections table
CREATE TABLE public.cms_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress', 'shopify', 'webflow')),
  site_url TEXT NOT NULL,
  api_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.cms_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for CMS connections
CREATE POLICY "Users can view their own CMS connections" ON public.cms_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CMS connections" ON public.cms_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CMS connections" ON public.cms_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CMS connections" ON public.cms_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Content templates table
CREATE TABLE public.content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('blog_post', 'product_description', 'landing_page', 'social_media')),
  structure JSONB NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for content templates
CREATE POLICY "Users can view their own templates and public templates" ON public.content_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" ON public.content_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.content_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.content_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Generation jobs table for tracking content generation progress
CREATE TABLE public.generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('article', 'keyword_research', 'image_generation', 'cms_publish')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB NOT NULL,
  output_data JSONB,
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for generation jobs
CREATE POLICY "Users can view their own generation jobs" ON public.generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generation jobs" ON public.generation_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation jobs" ON public.generation_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON public.content_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_articles_user_id ON public.articles(user_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_published_at ON public.articles(published_at);
CREATE INDEX idx_cms_connections_user_id ON public.cms_connections(user_id);
CREATE INDEX idx_content_templates_user_id ON public.content_templates(user_id);
CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);