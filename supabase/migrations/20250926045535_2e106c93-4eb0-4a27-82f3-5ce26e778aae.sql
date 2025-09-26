-- Set up cron job for daily article generation
-- This will run every hour to check if any users need articles generated
SELECT cron.schedule(
  'daily-content-generation', 
  '0 * * * *', -- Every hour at minute 0
  'SELECT public.trigger_daily_generation();'
);