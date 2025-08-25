-- Create config_integrations table for storing OAuth credentials
CREATE TABLE public.config_integrations (
    id text PRIMARY KEY,
    wp_supabase_client_id text,
    wp_supabase_client_secret text,
    updated_by_user_id uuid,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_integrations ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (server-only access)
CREATE POLICY "Service role can manage config_integrations"
ON public.config_integrations
FOR ALL
USING (auth.role() = 'service_role');

-- Create user roles enum and table if not exists (for admin access control)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        -- Users can view their own roles
        CREATE POLICY "Users can view their own roles"
        ON public.user_roles
        FOR SELECT
        USING (auth.uid() = user_id);
        
        -- Only service role can manage roles
        CREATE POLICY "Service role can manage user roles"
        ON public.user_roles
        FOR ALL
        USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Seed the config_integrations table
INSERT INTO public.config_integrations (
    id,
    wp_supabase_client_id,
    wp_supabase_client_secret,
    updated_by_user_id,
    updated_at
) VALUES (
    'global',
    '123424',
    '8bh3QJZJdR2TZ8OZ4szGe0bvuQeY4nbhcw43Jw3nISbZEf6Yhe3AaF1zQBchphka',
    null,
    now()
) ON CONFLICT (id) DO NOTHING;