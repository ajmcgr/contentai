-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists http with schema extensions;

-- Ensure any previous job is removed to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('invoke-daily-generation-every-5-mins');
EXCEPTION WHEN others THEN
  -- ignore if it didn't exist
  NULL;
END $$;

-- Schedule the daily-generation Edge Function every 5 minutes
select
  cron.schedule(
    'invoke-daily-generation-every-5-mins',
    '*/5 * * * *',
    $$
    select
      net.http_post(
          url:='https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/daily-generation',
          headers:='{"Content-Type": "application/json"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );