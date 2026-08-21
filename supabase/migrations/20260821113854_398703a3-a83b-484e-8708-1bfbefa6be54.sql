CREATE TABLE IF NOT EXISTS public.calculadora_usos (
  user_id UUID NOT NULL,
  dia DATE NOT NULL,
  interacoes INT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia)
);

GRANT SELECT ON public.calculadora_usos TO authenticated;
GRANT ALL ON public.calculadora_usos TO service_role;

ALTER TABLE public.calculadora_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário lê o próprio consumo" ON public.calculadora_usos;
CREATE POLICY "Usuário lê o próprio consumo"
  ON public.calculadora_usos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin lê todo o consumo" ON public.calculadora_usos;
CREATE POLICY "Admin lê todo o consumo"
  ON public.calculadora_usos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.orcamento_calculadora(_plataforma TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * CASE lower(coalesce(_plataforma, ''))
    WHEN 'shopee'       THEN 6
    WHEN 'tiktok'       THEN 7
    WHEN 'amazon'       THEN 9
    WHEN 'mercadolivre' THEN 10
    WHEN 'magalu'       THEN 11
    WHEN 'shein'        THEN 11
    ELSE 6
  END
$$;

CREATE OR REPLACE FUNCTION public.tem_plano_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN TRUE;
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.purchases p
    WHERE p.user_email = _email
      AND p.status = 'approved'
      AND (
        p.plan_type = 'lifetime'
        OR (p.expires_at IS NOT NULL AND p.expires_at > now())
      )
  );
END;
$$;

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
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('autenticado', false);
  END IF;
  IF public.tem_plano_ativo(_uid) THEN
    RETURN jsonb_build_object(
      'autenticado', true, 'ilimitado', true,
      'usados', 0, 'limite', _limite, 'restantes', _limite
    );
  END IF;
  SELECT interacoes INTO _usados
  FROM public.calculadora_usos
  WHERE user_id = _uid AND dia = _hoje;
  _usados := COALESCE(_usados, 0);
  RETURN jsonb_build_object(
    'autenticado', true, 'ilimitado', false,
    'usados', _usados, 'limite', _limite,
    'restantes', GREATEST(_limite - _usados, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consumir_interacao_calculadora(_plataforma TEXT DEFAULT 'shopee')
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _limite INT := public.orcamento_calculadora(_plataforma);
  _usados INT;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('permitido', false, 'autenticado', false);
  END IF;
  IF public.tem_plano_ativo(_uid) THEN
    RETURN jsonb_build_object(
      'permitido', true, 'autenticado', true, 'ilimitado', true,
      'usados', 0, 'limite', _limite, 'restantes', _limite
    );
  END IF;
  INSERT INTO public.calculadora_usos AS c (user_id, dia, interacoes, atualizado_em)
  VALUES (_uid, _hoje, 1, now())
  ON CONFLICT (user_id, dia) DO UPDATE
    SET interacoes = c.interacoes + 1, atualizado_em = now()
    WHERE c.interacoes < _limite
  RETURNING c.interacoes INTO _usados;
  IF _usados IS NULL THEN
    SELECT interacoes INTO _usados
    FROM public.calculadora_usos
    WHERE user_id = _uid AND dia = _hoje;
    RETURN jsonb_build_object(
      'permitido', false, 'autenticado', true, 'ilimitado', false,
      'usados', COALESCE(_usados, _limite), 'limite', _limite, 'restantes', 0
    );
  END IF;
  RETURN jsonb_build_object(
    'permitido', true, 'autenticado', true, 'ilimitado', false,
    'usados', _usados, 'limite', _limite,
    'restantes', GREATEST(_limite - _usados, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consumir_interacao_calculadora(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.status_acesso(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consumir_interacao_calculadora(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.status_acesso(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_plano_ativo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orcamento_calculadora(TEXT) TO anon, authenticated;