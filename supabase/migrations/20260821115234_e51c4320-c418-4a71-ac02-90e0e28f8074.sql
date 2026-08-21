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

DROP POLICY IF EXISTS "Usuário apaga os próprios custos" ON public.custos_extras;

CREATE POLICY "Usuário apaga os próprios custos"
  ON public.custos_extras FOR DELETE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));