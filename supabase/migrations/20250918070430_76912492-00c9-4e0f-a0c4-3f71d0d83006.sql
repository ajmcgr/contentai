-- Create wix_connections table for storing Wix OAuth tokens
CREATE TABLE public.wix_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instance_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wix_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own Wix connections" 
ON public.wix_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Wix connections" 
ON public.wix_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Wix connections" 
ON public.wix_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Wix connections" 
ON public.wix_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can manage all connections
CREATE POLICY "Service role can manage all Wix connections" 
ON public.wix_connections 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wix_connections_updated_at
BEFORE UPDATE ON public.wix_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();