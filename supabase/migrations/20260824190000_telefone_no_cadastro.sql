-- Telefone no cadastro, e a guarda de admin que faltava na listagem.
--
-- ATENÇÃO, a parte mais importante deste arquivo:
--
-- `get_all_users_with_purchases` é SECURITY DEFINER, está liberada para o papel
-- `authenticated` e NÃO tinha nenhuma checagem de admin no corpo. O comentário
-- dela dizia "admin only", mas quem garantia isso era só a tela: o AdminPanel
-- consulta has_role antes de renderizar. Chamar a RPC direto pelo cliente
-- devolvia email, data de cadastro, último login e plano de todos os usuários
-- para qualquer pessoa logada.
--
-- Acrescentar o telefone sem fechar isso transformaria um vazamento de emails
-- num vazamento de telefones, então a guarda entra antes.

-- 1) Listagem de usuários: só admin, e agora com telefone.
DROP FUNCTION IF EXISTS public.get_all_users_with_purchases();

CREATE FUNCTION public.get_all_users_with_purchases()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  purchase_id uuid,
  plan_type text,
  status text,
  purchased_at timestamptz,
  expires_at timestamptz,
  product_name text,
  telefone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    p.id,
    p.plan_type,
    p.status,
    p.purchased_at,
    p.expires_at,
    p.product_name,
    perf.telefone
  FROM auth.users au
  LEFT JOIN public.purchases p ON p.user_email = au.email::text
  LEFT JOIN public.perfis perf ON perf.user_email = au.email::text;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users_with_purchases() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_purchases() TO authenticated;

COMMENT ON FUNCTION public.get_all_users_with_purchases() IS
  'Listagem administrativa de contas. Levanta exceção para quem não é admin — a checagem está no corpo, não só na tela.';

-- 2) O cadastro passa a mandar o telefone no metadata, e um trigger cria a
--    linha em `perfis`.
--
--    Pelo cliente não funcionaria: quando o projeto exige confirmação por
--    email, o signUp devolve sessão nula e o RLS barraria o insert. O telefone
--    se perderia justamente em quem ainda não confirmou.
CREATE OR REPLACE FUNCTION public.criar_perfil_no_cadastro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _telefone TEXT;
BEGIN
  _telefone := NULLIF(trim(NEW.raw_user_meta_data ->> 'telefone'), '');

  IF _telefone IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nunca derrubar o cadastro por causa do perfil: se o erro subir, o usuário
  -- não chega a ser criado e a pessoa fica sem entender por que não consegue
  -- entrar. Perfil faltando se resolve depois; conta que não nasce, não.
  BEGIN
    INSERT INTO public.perfis (user_email, telefone)
    VALUES (NEW.email, _telefone)
    ON CONFLICT (user_email) DO UPDATE
      SET telefone = EXCLUDED.telefone,
          updated_at = now()
      -- Não sobrescreve telefone que a pessoa já tenha preenchido no perfil.
      WHERE public.perfis.telefone IS NULL OR public.perfis.telefone = '';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Falha ao criar perfil do usuário %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_perfil ON auth.users;
CREATE TRIGGER on_auth_user_created_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_perfil_no_cadastro();
