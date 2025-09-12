-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the daily generation edge function
CREATE OR REPLACE FUNCTION trigger_daily_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Call the daily-generation edge function
    SELECT content::jsonb INTO result
    FROM http((
        'POST',
        current_setting('app.base_url') || '/functions/v1/daily-generation',
        ARRAY[
            http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{}'
    ));
    
    -- Log the result
    RAISE NOTICE 'Daily generation result: %', result;
END;
$$;

-- Schedule the function to run daily at 6:30 PM UTC
-- This will check user preferences and generate content accordingly
SELECT cron.schedule(
    'daily-content-generation',
    '30 18 * * *', -- 6:30 PM UTC daily
    'SELECT trigger_daily_generation();'
);