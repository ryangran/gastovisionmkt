CREATE TABLE IF NOT EXISTS public.perfis (
  user_email TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  nome_loja TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  foto_url TEXT,
  regime_tributario TEXT NOT NULL DEFAULT 'nao_informado',
  simples_anexo TEXT,
  simples_rbt12 NUMERIC,
  imposto_percent NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.perfis
  ADD CONSTRAINT perfis_imposto_valido CHECK (imposto_percent >= 0 AND imposto_percent <= 100);

DROP POLICY IF EXISTS "Usuário lê o próprio perfil" ON public.perfis;
CREATE POLICY "Usuário lê o próprio perfil"
  ON public.perfis FOR SELECT TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Usuário cria o próprio perfil" ON public.perfis;
CREATE POLICY "Usuário cria o próprio perfil"
  ON public.perfis FOR INSERT TO authenticated
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Usuário edita o próprio perfil" ON public.perfis;
CREATE POLICY "Usuário edita o próprio perfil"
  ON public.perfis FOR UPDATE TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Avatar de leitura pública" ON storage.objects;
CREATE POLICY "Avatar de leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuário envia o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário envia o próprio avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Usuário troca o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário troca o próprio avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Usuário apaga o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário apaga o próprio avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);