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
  ORDER BY COALESCE(p.purchased_at, p.created_at) DESC, p.created_at DESC
  LIMIT 1;

  RETURN _plano;
END;
$$;

COMMENT ON FUNCTION public.plano_do_usuario(UUID) IS
  'Plano vigente do usuário: o da compra aprovada e vigente mais recente.';