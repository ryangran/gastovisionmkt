
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  transaction_id TEXT,
  product_name TEXT DEFAULT 'Calculadora de Preços',
  status TEXT NOT NULL DEFAULT 'approved',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.purchases
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Service role can insert purchases"
  ON public.purchases
  FOR INSERT
  TO service_role
  WITH CHECK (true);
