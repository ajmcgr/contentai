-- Deduplicate brand_settings by keeping the most recent per user_id
WITH ranked AS (
  SELECT id, user_id, updated_at, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn
  FROM public.brand_settings
)
DELETE FROM public.brand_settings b
USING ranked r
WHERE b.id = r.id AND r.rn > 1;

-- Ensure one settings row per user
ALTER TABLE public.brand_settings
ADD CONSTRAINT brand_settings_user_id_unique UNIQUE (user_id);

-- Helpful index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_brand_settings_user_id ON public.brand_settings (user_id);

-- Helpful index for ordering by updated_at
CREATE INDEX IF NOT EXISTS idx_brand_settings_updated_at ON public.brand_settings (updated_at DESC);