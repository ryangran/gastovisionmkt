-- O plano vigente passa a ser o da compra MAIS RECENTE, não o de maior nível.
--
-- A regra anterior ordenava por nível (deluxe > plus > essencial) para que
-- quem assinasse o Essencial e depois comprasse o Deluxe não ficasse preso no
-- Essencial. O efeito colateral apareceu na prática: com mais de uma compra na
-- conta, mudar o plano pelo painel admin não surtia efeito nenhum, porque uma
-- compra antiga de nível mais alto continuava vencendo em silêncio.
--
-- Recência resolve os dois casos de uma vez:
--
--   upgrade     -> a compra nova é a mais recente e vence
--   admin muda  -> a edição carimba purchased_at = now() e vence
--
-- A troca tem um custo, e vale registrar: se alguém tem Deluxe vitalício e
-- compra um Essencial mensal por engano, agora o Essencial vale. Antes o
-- Deluxe se mantinha. É o preço de a última ação sempre mandar, e sem isso o
-- painel admin não é confiável.

CREATE OR REPLACE FUNCTION public.plano_do_usuario(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _plano TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN 'deluxe';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT public.nivel_do_plan_type(p.plan_type) INTO _plano
  FROM public.purchases p
  WHERE p.user_email = _email
    AND p.status = 'approved'
    AND public.nivel_do_plan_type(p.plan_type) IS NOT NULL
    AND (
      public.nivel_do_plan_type(p.plan_type) = 'deluxe'
      OR (p.expires_at IS NOT NULL AND p.expires_at > now())
    )
  -- coalesce porque purchased_at pode vir nulo em linha antiga; aí created_at
  -- é a melhor aproximação de quando aquilo entrou.
  ORDER BY COALESCE(p.purchased_at, p.created_at) DESC, p.created_at DESC
  LIMIT 1;

  RETURN _plano;
END;
$$;

COMMENT ON FUNCTION public.plano_do_usuario(UUID) IS
  'Plano vigente do usuário: o da compra aprovada e vigente mais recente. Traduz os plan_type legados (lifetime, monthly, daily) para os novos níveis.';
