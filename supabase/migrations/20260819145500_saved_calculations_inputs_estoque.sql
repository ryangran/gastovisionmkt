-- Guarda as entradas completas da calculadora e a quantidade em estoque.
--
-- Motivo: até aqui saved_calculations guardava só preço, custo e margem. Sem as
-- entradas (peso, categoria, modelo de envio, etc.) não há como recalcular um
-- produto salvo quando a taxa do marketplace mudar — que é o que sustenta o
-- aviso de margem afetada. A quantidade em estoque alimenta o custo imobilizado
-- no dashboard.

ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_version TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saved_calculations_stock_quantity_nao_negativo'
  ) THEN
    ALTER TABLE public.saved_calculations
      ADD CONSTRAINT saved_calculations_stock_quantity_nao_negativo
      CHECK (stock_quantity >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.saved_calculations.inputs IS
  'Entradas completas da calculadora, para permitir recálculo quando a taxa mudar.';
COMMENT ON COLUMN public.saved_calculations.stock_quantity IS
  'Unidades em estoque, usadas para o custo imobilizado no dashboard.';
COMMENT ON COLUMN public.saved_calculations.fee_version IS
  'Versão da tabela de taxas usada no cálculo gravado.';

CREATE INDEX IF NOT EXISTS saved_calculations_user_email_idx
  ON public.saved_calculations (user_email);

-- O usuário já podia ler, inserir e apagar os próprios cálculos; faltava
-- atualizar, necessário para o recálculo gravar a margem nova.
DROP POLICY IF EXISTS "Users can update own saved calculations" ON public.saved_calculations;
CREATE POLICY "Users can update own saved calculations"
  ON public.saved_calculations FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));
