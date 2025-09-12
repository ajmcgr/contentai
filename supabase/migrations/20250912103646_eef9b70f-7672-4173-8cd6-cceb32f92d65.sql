-- Fix the search_path for the trigger_daily_generation function
CREATE OR REPLACE FUNCTION trigger_daily_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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