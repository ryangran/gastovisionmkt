
ALTER TABLE public.purchases 
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
