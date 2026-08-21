-- Fecha o vazamento entre clientes nas tabelas do módulo de estoque.
--
-- O que estava acontecendo:
--
--   products         FOR ALL USING (true) WITH CHECK (true), sem restrição de
--                    papel. Qualquer pessoa, inclusive sem login, conseguia
--                    ler, inserir, alterar e APAGAR todos os produtos usando
--                    só a chave anônima que vai no bundle do site.
--   movements        SELECT e INSERT liberados para anônimo.
--   stock_requests   qualquer autenticado lia, criava e alterava tudo.
--   purchase_orders  qualquer autenticado lia tudo.
--   crm_tasks        idem.
--   crm_routines     idem.
--   platform_costs   idem.
--
-- Enquanto só o admin criava contas, "qualquer autenticado" era o mesmo que
-- "meus clientes". Depois que o cadastro abriu, virou qualquer pessoa da
-- internet. Nenhuma dessas tabelas é usada por página que esteja no ar hoje,
-- então o corte é direto: só admin.
--
-- As tabelas do que está no ar (saved_calculations, custos_extras, perfis,
-- purchases, push_subscriptions, calculadora_usos) já isolam por
-- user_email/user_id e não são tocadas aqui.

-- Apaga toda policy existente das tabelas afetadas. Enumerar nome por nome
-- seria frágil, porque migrations antigas criaram a mesma policy com nomes
-- diferentes e não dá para saber quais sobreviveram no banco real.
DO $$
DECLARE
  _tabela TEXT;
  _policy TEXT;
BEGIN
  FOREACH _tabela IN ARRAY ARRAY[
    'products', 'movements', 'stock_requests', 'purchase_orders',
    'crm_tasks', 'crm_routines', 'platform_costs'
  ] LOOP
    IF to_regclass('public.' || _tabela) IS NULL THEN
      CONTINUE;
    END IF;

    FOR _policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = _tabela
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _policy, _tabela);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _tabela);
    -- Sem FORCE de propósito: ele faria a RLS valer também para o dono da
    -- tabela, e não dá para testar aqui se alguma trigger roda como dono.
    -- ENABLE mais as policies abaixo já fecham o acesso pela API.

    -- Tira o acesso do papel anônimo no nível do GRANT, não só da policy.
    -- Policy sem GRANT já barra, mas os dois juntos evitam que uma policy
    -- criada por engano no futuro reabra a porta sozinha.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', _tabela);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', _tabela);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', _tabela);

    EXECUTE format(
      'CREATE POLICY "Somente admin opera %1$s" ON public.%1$I FOR ALL TO authenticated '
      'USING (public.has_role(auth.uid(), ''admin''::app_role)) '
      'WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      _tabela
    );
  END LOOP;
END
$$;

-- custos_extras nasceu sem policy de DELETE, então quem cadastrava uma
-- embalagem errada não conseguia apagar. Fica restrita ao dono, igual às
-- outras três.
DROP POLICY IF EXISTS "Usuário apaga os próprios custos" ON public.custos_extras;
CREATE POLICY "Usuário apaga os próprios custos"
  ON public.custos_extras FOR DELETE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- Verificação. Depois de rodar, esta consulta tem que voltar vazia: ela lista
-- qualquer policy do schema public que libere geral, seja por USING (true) ou
-- por não filtrar nada. Vale rodar de novo sempre que criar tabela nova.
--
--   SELECT tablename, policyname, roles, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename NOT IN ('platform_fees', 'mentoria_leads')
--     AND (
--       coalesce(qual, 'true') = 'true'
--       OR coalesce(with_check, 'true') = 'true'
--       OR 'anon' = ANY(roles)
--     );
--
-- platform_fees fica de fora porque a tabela de taxas é compartilhada de
-- propósito: é a mesma para todo mundo e só o admin escreve. mentoria_leads
-- fica de fora porque o formulário público precisa aceitar INSERT anônimo,
-- e a leitura dela já é só de admin.
