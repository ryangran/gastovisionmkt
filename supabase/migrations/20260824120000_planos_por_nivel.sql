-- Planos por nível: essencial, plus e deluxe.
--
-- Antes o acesso era tudo-ou-nada: `tem_plano_ativo` devolvia um booleano e
-- quem tinha qualquer compra aprovada abria a plataforma inteira. Agora cada
-- plano libera um conjunto diferente de áreas, então o banco precisa dizer
-- QUAL plano a pessoa tem, não só se tem algum.
--
-- Os valores antigos de plan_type continuam valendo e são traduzidos aqui:
-- ninguém que já paga perde acesso ao trocar o modelo.
--
--   lifetime  -> deluxe   (era acesso total vitalício, segue total vitalício)
--   monthly   -> plus     (era acesso total mensal; vira tudo menos fornecedores)
--   daily     -> plus     (teste de 1 dia, mesmo tratamento do mensal)
--
-- Rebaixar quem já pagou para o Essencial geraria cancelamento e reclamação,
-- e o ganho seria pequeno perto disso.

-- Traduz um plan_type, novo ou legado, para o nível de acesso.
CREATE OR REPLACE FUNCTION public.nivel_do_plan_type(_plan_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(_plan_type, ''))
    WHEN 'deluxe'    THEN 'deluxe'
    WHEN 'lifetime'  THEN 'deluxe'
    WHEN 'plus'      THEN 'plus'
    WHEN 'monthly'   THEN 'plus'
    WHEN 'daily'     THEN 'plus'
    WHEN 'essencial' THEN 'essencial'
    ELSE NULL
  END;
$$;

-- Ranking para escolher o melhor plano quando há mais de uma compra vigente.
CREATE OR REPLACE FUNCTION public.peso_do_plano(_plano TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _plano
    WHEN 'deluxe'    THEN 3
    WHEN 'plus'      THEN 2
    WHEN 'essencial' THEN 1
    ELSE 0
  END;
$$;

-- Devolve o plano vigente da pessoa, ou NULL se não tem nenhum.
--
-- Quem tem mais de uma compra aprovada fica com a de maior nível. Sem isso,
-- alguém que assinou o Essencial e depois comprou o Deluxe poderia acabar
-- preso no Essencial dependendo da ordem das linhas.
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

  -- Admin enxerga tudo, senão o suporte não consegue reproduzir problema de
  -- quem paga.
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
      -- Deluxe e o antigo lifetime não expiram.
      public.nivel_do_plan_type(p.plan_type) = 'deluxe'
      OR (p.expires_at IS NOT NULL AND p.expires_at > now())
    )
  ORDER BY public.peso_do_plano(public.nivel_do_plan_type(p.plan_type)) DESC
  LIMIT 1;

  RETURN _plano;
END;
$$;

-- Continua existindo porque a calculadora sem limite vale para qualquer plano,
-- inclusive o Essencial. Agora é derivada, para não haver duas regras sobre o
-- que conta como plano ativo.
CREATE OR REPLACE FUNCTION public.tem_plano_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.plano_do_usuario(_user_id) IS NOT NULL;
$$;

-- status_acesso passa a devolver o plano. `ilimitado` fica, porque é o que a
-- calculadora usa para saber se cobra do orçamento diário, e vale para os três.
CREATE OR REPLACE FUNCTION public.status_acesso(_plataforma TEXT DEFAULT 'shopee')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _limite INT := public.orcamento_calculadora(_plataforma);
  _usados INT;
  _plano TEXT;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('autenticado', false);
  END IF;

  _plano := public.plano_do_usuario(_uid);

  IF _plano IS NOT NULL THEN
    RETURN jsonb_build_object(
      'autenticado', true, 'ilimitado', true, 'plano', _plano,
      'usados', 0, 'limite', _limite, 'restantes', _limite
    );
  END IF;

  SELECT interacoes INTO _usados
  FROM public.calculadora_usos
  WHERE user_id = _uid AND dia = _hoje;

  _usados := COALESCE(_usados, 0);

  RETURN jsonb_build_object(
    'autenticado', true, 'ilimitado', false, 'plano', NULL,
    'usados', _usados, 'limite', _limite,
    'restantes', GREATEST(_limite - _usados, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.plano_do_usuario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plano_do_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nivel_do_plan_type(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.peso_do_plano(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.status_acesso(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_plano_ativo(UUID) TO authenticated;

COMMENT ON FUNCTION public.plano_do_usuario(UUID) IS
  'Plano vigente do usuário: deluxe, plus, essencial ou NULL. Traduz os plan_type legados (lifetime, monthly, daily) para os novos níveis.';
