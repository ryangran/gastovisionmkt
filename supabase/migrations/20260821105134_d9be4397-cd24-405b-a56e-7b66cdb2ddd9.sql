CREATE TABLE IF NOT EXISTS public.mentoria_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  faturamento TEXT NOT NULL,
  plataformas TEXT[] NOT NULL DEFAULT '{}',
  tempo_vendendo TEXT NOT NULL,
  precifica_hoje TEXT NOT NULL,
  objetivos TEXT[] NOT NULL DEFAULT '{}',
  urgencia TEXT NOT NULL,
  dor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentoria_leads_created_idx
  ON public.mentoria_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS mentoria_leads_status_idx
  ON public.mentoria_leads (status);

ALTER TABLE public.mentoria_leads
  DROP CONSTRAINT IF EXISTS mentoria_leads_status_valido;
ALTER TABLE public.mentoria_leads
  ADD CONSTRAINT mentoria_leads_status_valido
  CHECK (status IN ('novo', 'contatado', 'respondeu', 'fechado', 'perdido'));

GRANT INSERT ON public.mentoria_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.mentoria_leads TO authenticated;
GRANT ALL ON public.mentoria_leads TO service_role;

ALTER TABLE public.mentoria_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitante envia formulário de mentoria" ON public.mentoria_leads;
CREATE POLICY "Visitante envia formulário de mentoria"
  ON public.mentoria_leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'novo'
    AND observacoes = ''
    AND char_length(nome) BETWEEN 2 AND 120
    AND char_length(telefone) BETWEEN 8 AND 20
    AND char_length(dor) BETWEEN 1 AND 2000
    AND char_length(coalesce(email, '')) <= 160
    AND array_length(plataformas, 1) IS NOT NULL
    AND array_length(plataformas, 1) <= 6
    AND coalesce(array_length(objetivos, 1), 0) <= 8
  );

DROP POLICY IF EXISTS "Admin lê os leads de mentoria" ON public.mentoria_leads;
CREATE POLICY "Admin lê os leads de mentoria"
  ON public.mentoria_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin atualiza os leads de mentoria" ON public.mentoria_leads;
CREATE POLICY "Admin atualiza os leads de mentoria"
  ON public.mentoria_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin apaga os leads de mentoria" ON public.mentoria_leads;
CREATE POLICY "Admin apaga os leads de mentoria"
  ON public.mentoria_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.mentoria_leads_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mentoria_leads_touch_trg ON public.mentoria_leads;
CREATE TRIGGER mentoria_leads_touch_trg
  BEFORE UPDATE ON public.mentoria_leads
  FOR EACH ROW EXECUTE FUNCTION public.mentoria_leads_touch();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'ryanzinho.gran@gmail.com'
ON CONFLICT DO NOTHING;