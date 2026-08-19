CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  version TEXT NOT NULL,
  config JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_fees TO authenticated;
GRANT ALL ON public.platform_fees TO service_role;

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticado lê taxas ativas" ON public.platform_fees;

CREATE POLICY "Autenticado lê taxas ativas"
  ON public.platform_fees FOR SELECT TO authenticated USING (active);

DROP POLICY IF EXISTS "Admin gerencia taxas" ON public.platform_fees;

CREATE POLICY "Admin gerencia taxas"
  ON public.platform_fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS platform_fees_ativa_por_plataforma
  ON public.platform_fees (platform) WHERE active;

ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS previous_margin_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS recalculated_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Admin lê todos os cálculos" ON public.saved_calculations;

CREATE POLICY "Admin lê todos os cálculos"
  ON public.saved_calculations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin atualiza todos os cálculos" ON public.saved_calculations;

CREATE POLICY "Admin atualiza todos os cálculos"
  ON public.saved_calculations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));