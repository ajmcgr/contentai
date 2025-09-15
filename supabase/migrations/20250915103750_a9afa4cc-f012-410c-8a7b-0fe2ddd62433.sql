-- Create app_logs table for diagnostics
CREATE TABLE IF NOT EXISTS public.app_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  provider text,
  stage text NOT NULL,
  level text DEFAULT 'info'::text,
  correlation_id text,
  detail text
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS app_logs_created_idx ON public.app_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own logs" ON public.app_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage all logs" ON public.app_logs
  FOR ALL USING (auth.role() = 'service_role'::text);