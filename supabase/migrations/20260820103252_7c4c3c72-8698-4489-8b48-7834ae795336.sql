CREATE TABLE IF NOT EXISTS public.custos_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_extras
  ADD CONSTRAINT custos_extras_valor_nao_negativo CHECK (valor >= 0);

CREATE INDEX IF NOT EXISTS custos_extras_user_email_idx
  ON public.custos_extras (user_email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos_extras TO authenticated;
GRANT ALL ON public.custos_extras TO service_role;

ALTER TABLE public.custos_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário lê os próprios custos" ON public.custos_extras;
CREATE POLICY "Usuário lê os próprios custos"
  ON public.custos_extras FOR SELECT TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Usuário cria os próprios custos" ON public.custos_extras;
CREATE POLICY "Usuário cria os próprios custos"
  ON public.custos_extras FOR INSERT TO authenticated
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Usuário edita os próprios custos" ON public.custos_extras;
CREATE POLICY "Usuário edita os próprios custos"
  ON public.custos_extras FOR UPDATE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Usuário apaga os próprios custos" ON public.custos_extras;
CREATE POLICY "Usuário apaga os próprios custos"
  ON public.custos_extras FOR DELETE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));