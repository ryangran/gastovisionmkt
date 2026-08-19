ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_version TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS saved_calculations_user_email_idx
  ON public.saved_calculations (user_email);

DROP POLICY IF EXISTS "Users can update own saved calculations" ON public.saved_calculations;

CREATE POLICY "Users can update own saved calculations"
  ON public.saved_calculations FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

DROP TRIGGER IF EXISTS update_saved_calculations_updated_at ON public.saved_calculations;
CREATE TRIGGER update_saved_calculations_updated_at
  BEFORE UPDATE ON public.saved_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();