-- Create proper cron job that calls the edge function
SELECT cron.schedule(
  'daily-article-generation',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/daily-generation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcnptYWZ3dmhpZmpoc29pemlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzc5ODQ0OCwiZXhwIjoyMDUzMzc0NDQ4fQ.dRfNlLf74UrmLm0mWlGqJ8FDWa8E4YiTJPKlF4Vbq5M"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);