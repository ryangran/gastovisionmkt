CREATE TABLE public.saved_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  platform TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sale_price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  profit_margin_percent NUMERIC NOT NULL,
  profit_margin_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved calculations"
  ON public.saved_calculations FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own saved calculations"
  ON public.saved_calculations FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own saved calculations"
  ON public.saved_calculations FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE INDEX idx_saved_calculations_user_email ON public.saved_calculations(user_email);