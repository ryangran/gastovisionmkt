-- Segunda parte do isolamento. A primeira cuidou das tabelas sem coluna de
-- dono. Esta cuida das que têm user_email mas não usavam.
--
-- O problema estava em is_authenticated_user(), que é só
-- "SELECT auth.uid() IS NOT NULL". Ela responde "está logado", e não "é o
-- dono". Policy de SELECT que confia só nela libera a tabela inteira para
-- qualquer pessoa com conta, e agora qualquer pessoa pode criar conta.
--
--   decision_history  SELECT USING (is_authenticated_user())
--                     -> qualquer logado lia justificativa e produto de todo
--                        mundo
--   company_memory    SELECT USING (is_authenticated_user())
--                     -> qualquer logado lia employee_name, notes, summary,
--                        reason e sku de todo mundo
--   activity_logs     INSERT WITH CHECK (is_authenticated_user())
--                     -> dava para gravar log no nome de outra pessoa. O
--                        SELECT já estava certo, filtrando por dono.
--
-- De quebra troca TO public por TO authenticated onde o acesso é só de quem
-- tem conta. As policies já barravam anônimo pelo USING, porque auth.jwt()
-- vem nulo e não casa com nada, mas depender disso é ficar a um bug de
-- função de distância de abrir tudo.

DO $$
DECLARE
  _tabela TEXT;
  _policy TEXT;
BEGIN
  FOREACH _tabela IN ARRAY ARRAY[
    'decision_history', 'company_memory', 'activity_logs', 'saved_calculations'
  ] LOOP
    IF to_regclass('public.' || _tabela) IS NULL THEN
      CONTINUE;
    END IF;

    -- Varre em vez de listar nome por nome: migrations antigas criaram as
    -- mesmas policies com nomes diferentes e algumas ficaram duplicadas.
    FOR _policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = _tabela
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _policy, _tabela);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _tabela);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', _tabela);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', _tabela);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------- histórico

GRANT SELECT, INSERT ON public.decision_history TO authenticated;

CREATE POLICY "Dono ou admin lê o histórico de decisões"
  ON public.decision_history FOR SELECT TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin grava o histórico de decisões"
  ON public.decision_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin edita o histórico de decisões"
  ON public.decision_history FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin apaga o histórico de decisões"
  ON public.decision_history FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ------------------------------------------------------ memória da empresa

GRANT SELECT ON public.company_memory TO authenticated;

CREATE POLICY "Dono ou admin lê a memória da empresa"
  ON public.company_memory FOR SELECT TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin grava a memória da empresa"
  ON public.company_memory FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin edita a memória da empresa"
  ON public.company_memory FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin apaga a memória da empresa"
  ON public.company_memory FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ------------------------------------------------------------------- logs

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

CREATE POLICY "Dono ou admin lê os logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Só dá para registrar log no próprio nome. Antes bastava estar logado, e o
-- user_email vinha do cliente, então dava para forjar log de outra pessoa.
CREATE POLICY "Usuário registra o próprio log"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

-- ---------------------------------------------------- cálculos salvos

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_calculations TO authenticated;

CREATE POLICY "Dono ou admin lê os cálculos salvos"
  ON public.saved_calculations FOR SELECT TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Usuário salva os próprios cálculos"
  ON public.saved_calculations FOR INSERT TO authenticated
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

-- O admin precisa entrar aqui. Quando uma taxa de marketplace muda, a
-- GestaoTaxas recalcula a margem dos produtos salvos de todos os clientes e
-- grava de volta. Sem a cláusula de admin, o aviso de mudança de taxa, que é
-- o argumento de venda mais forte do produto, para de funcionar em silêncio.
CREATE POLICY "Dono ou admin edita os cálculos salvos"
  ON public.saved_calculations FOR UPDATE TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Usuário apaga os próprios cálculos"
  ON public.saved_calculations FOR DELETE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ------------------------------------------- permissões de página e settings
-- Aqui não muda quem pode o quê, só sai de TO public para TO authenticated.

DO $$
DECLARE
  _policy TEXT;
BEGIN
  FOR _policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_page_permissions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_page_permissions', _policy);
  END LOOP;

  FOR _policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settings', _policy);
  END LOOP;
END
$$;

REVOKE ALL ON public.user_page_permissions FROM anon;
REVOKE ALL ON public.settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_page_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.user_page_permissions TO service_role;
GRANT ALL ON public.settings TO service_role;

-- A pessoa precisa enxergar as próprias permissões para o app saber o que
-- mostrar. As dos outros, não.
CREATE POLICY "Dono ou admin lê as permissões"
  ON public.user_page_permissions FOR SELECT TO authenticated
  USING (
    user_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin gerencia as permissões"
  ON public.user_page_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia as configurações"
  ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
