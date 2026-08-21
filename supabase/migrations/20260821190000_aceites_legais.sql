-- Prova de consentimento dos documentos legais.
--
-- A LGPD exige que o controlador consiga demonstrar que o titular consentiu.
-- Aceite que só existe na tela do navegador não prova nada, então cada aceite
-- vira uma linha aqui, com a versão do documento que estava valendo na hora.
--
-- Uma linha por documento, e não uma linha com três colunas: quando um dos
-- textos for atualizado, dá para saber exatamente quem já aceitou a versão
-- nova e quem ainda precisa reaceitar.

CREATE TABLE IF NOT EXISTS public.aceites_legais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento TEXT NOT NULL,
  versao TEXT NOT NULL,
  aceito_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  origem TEXT NOT NULL DEFAULT 'cadastro'
);

ALTER TABLE public.aceites_legais
  DROP CONSTRAINT IF EXISTS aceites_legais_documento_valido;
ALTER TABLE public.aceites_legais
  ADD CONSTRAINT aceites_legais_documento_valido
  CHECK (documento IN ('termos', 'privacidade', 'cookies'));

ALTER TABLE public.aceites_legais
  DROP CONSTRAINT IF EXISTS aceites_legais_origem_valida;
ALTER TABLE public.aceites_legais
  ADD CONSTRAINT aceites_legais_origem_valida
  CHECK (origem IN ('cadastro', 'reaceite'));

-- Reaceitar a mesma versão do mesmo documento não gera linha nova.
CREATE UNIQUE INDEX IF NOT EXISTS aceites_legais_unico_idx
  ON public.aceites_legais (user_id, documento, versao);

CREATE INDEX IF NOT EXISTS aceites_legais_user_idx
  ON public.aceites_legais (user_id);

ALTER TABLE public.aceites_legais ENABLE ROW LEVEL SECURITY;

-- Sem GRANT de UPDATE nem DELETE para authenticated: registro de consentimento
-- que o próprio titular pode reescrever não serve como prova.
GRANT SELECT ON public.aceites_legais TO authenticated;
GRANT ALL ON public.aceites_legais TO service_role;

DROP POLICY IF EXISTS "Titular lê o próprio aceite" ON public.aceites_legais;
CREATE POLICY "Titular lê o próprio aceite"
  ON public.aceites_legais
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin lê todos os aceites" ON public.aceites_legais;
CREATE POLICY "Admin lê todos os aceites"
  ON public.aceites_legais
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grava o aceite a partir do metadata que o cadastro enviou.
--
-- Escrever pelo trigger, e não pelo cliente, resolve dois problemas. Quando o
-- projeto exige confirmação por email, o signUp devolve sessão nula e o cliente
-- não teria como escrever nada — o aceite se perderia justamente em quem ainda
-- não confirmou. E o registro passa a nascer no servidor, fora do alcance de
-- quem quisesse forjar o próprio consentimento.
CREATE OR REPLACE FUNCTION public.registrar_aceite_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _aceites JSONB;
  _documento TEXT;
BEGIN
  _aceites := NEW.raw_user_meta_data -> 'aceites_legais';

  IF _aceites IS NULL OR jsonb_typeof(_aceites) <> 'object' THEN
    RETURN NEW;
  END IF;

  -- O bloco de exceção existe para o trigger nunca derrubar o cadastro. Se a
  -- gravação do aceite falhar e o erro subir, o usuário não chega a ser criado
  -- e a pessoa fica sem conseguir entrar sem entender o motivo — pior que um
  -- aceite faltando, que dá para cobrar depois.
  BEGIN
    FOREACH _documento IN ARRAY ARRAY['termos', 'privacidade', 'cookies'] LOOP
      IF jsonb_typeof(_aceites -> _documento) = 'string' THEN
        INSERT INTO public.aceites_legais (user_id, documento, versao, origem)
        VALUES (NEW.id, _documento, _aceites ->> _documento, 'cadastro')
        ON CONFLICT (user_id, documento, versao) DO NOTHING;
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Falha ao registrar aceite legal do usuário %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_aceite_legal ON auth.users;
CREATE TRIGGER on_auth_user_created_aceite_legal
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_aceite_legal();

COMMENT ON TABLE public.aceites_legais IS
  'Prova de consentimento LGPD. Uma linha por documento aceito, com a versão vigente no momento do aceite. Somente leitura para o titular.';
