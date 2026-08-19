-- Taxas dos marketplaces administráveis pelo banco, e o rastro do recálculo.
--
-- Até aqui as tabelas de comissão e frete viviam só no código, então qualquer
-- ajuste exigia deploy e os cálculos já salvos pelos clientes ficavam errados
-- em silêncio. Com a taxa no banco, o admin edita e o sistema recalcula a
-- carteira de todo mundo, marcando quem mudou de margem.

CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  version TEXT NOT NULL,
  config JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Só uma versão ativa por plataforma.
CREATE UNIQUE INDEX IF NOT EXISTS platform_fees_ativa_por_plataforma
  ON public.platform_fees (platform) WHERE active;

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticado lê taxas ativas" ON public.platform_fees;
CREATE POLICY "Autenticado lê taxas ativas"
  ON public.platform_fees FOR SELECT
  TO authenticated
  USING (active);

DROP POLICY IF EXISTS "Admin gerencia taxas" ON public.platform_fees;
CREATE POLICY "Admin gerencia taxas"
  ON public.platform_fees FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rastro do recálculo: guarda a margem anterior para o cliente ver o que mudou.
ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS previous_margin_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS recalculated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.saved_calculations.previous_margin_percent IS
  'Margem antes do último recálculo por mudança de taxa.';

-- O recálculo roda com a sessão do admin e precisa alcançar a carteira de
-- todos os clientes, não só a dele.
DROP POLICY IF EXISTS "Admin lê todos os cálculos" ON public.saved_calculations;
CREATE POLICY "Admin lê todos os cálculos"
  ON public.saved_calculations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin atualiza todos os cálculos" ON public.saved_calculations;
CREATE POLICY "Admin atualiza todos os cálculos"
  ON public.saved_calculations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
