-- Create table for routine definitions
CREATE TABLE public.crm_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'conditional')),
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. For weekly routines
  day_of_month_start INTEGER, -- For monthly routines (start day)
  day_of_month_end INTEGER, -- For monthly routines (end day)
  exclude_weekends BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to crm_tasks for routine tracking
ALTER TABLE public.crm_tasks 
ADD COLUMN routine_id UUID REFERENCES public.crm_routines(id) ON DELETE SET NULL,
ADD COLUMN frequency TEXT,
ADD COLUMN is_auto_generated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN scheduled_date DATE;

-- Enable RLS on crm_routines
ALTER TABLE public.crm_routines ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_routines
CREATE POLICY "Authenticated users can view routines" 
ON public.crm_routines 
FOR SELECT 
USING (is_authenticated_user());

CREATE POLICY "Admin users can insert routines" 
ON public.crm_routines 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update routines" 
ON public.crm_routines 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can delete routines" 
ON public.crm_routines 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_crm_routines_updated_at
BEFORE UPDATE ON public.crm_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert predefined routines for Ryan
INSERT INTO public.crm_routines (person_name, title, description, frequency, exclude_weekends) VALUES
-- Ryan Daily
('Ryan', 'Amazon – Operação Completa', 'Verificar pedidos, performance, métricas e possíveis alertas. Conferir status de anúncios e possíveis bloqueios.', 'daily', true),
('Ryan', 'Análise de Contas (Marketplaces)', 'Verificar saúde das contas (alertas, notificações, pendências).', 'daily', true),
('Ryan', 'Gestão de ADS (exceto Shopee BMS)', 'Monitorar campanhas: Mercado Livre, Amazon, Magalu, TikTok, Site próprio. Ajustar se houver alerta ou queda.', 'daily', true),
('Ryan', 'Gerenciamento de Revisões', 'Monitorar avaliações novas. Responder ou sinalizar problemas críticos.', 'daily', true),
('Ryan', 'Transmissão por Chat', 'Monitorar chats ativos. Responder mensagens pendentes.', 'daily', true),
('Ryan', 'Site Próprio', 'Verificar pedidos. Conferir funcionamento geral (checkout, páginas, erros).', 'daily', true),
('Ryan', 'TikTok Shop', 'Conferir pedidos, status da conta, pendências ou avisos.', 'daily', true);

-- Ryan Weekly (Monday = 1)
INSERT INTO public.crm_routines (person_name, title, description, frequency, day_of_week, exclude_weekends) VALUES
('Ryan', 'Relatório Resumo da Semana', 'Revisar: Performance geral da Amazon, Contas com alertas, ADS (exceto Shopee BMS). Registrar observações importantes.', 'weekly', 1, true);

-- Miria Daily
INSERT INTO public.crm_routines (person_name, title, description, frequency, exclude_weekends) VALUES
('Miria', 'Magalu – Operação Completa', 'Gerenciar pedidos, conferir anúncios, verificar possíveis pendências.', 'daily', true),
('Miria', 'Análise de Produtos', 'Avaliar produtos com: Baixa saída, Estoque alto, Possível ajuste.', 'daily', true),
('Miria', 'Precificação', 'Revisar preços com base em: Margem, Concorrência, Custos cadastrados.', 'daily', true),
('Miria', 'ADS Shopee BMS', 'Monitorar e ajustar campanhas da Shopee BMS.', 'daily', true);

-- Miria Weekly (Monday = 1)
INSERT INTO public.crm_routines (person_name, title, description, frequency, day_of_week, exclude_weekends) VALUES
('Miria', 'Criação de Artes para Representantes', 'Desenvolver artes promocionais.', 'weekly', 1, true);

-- Miria Monthly
INSERT INTO public.crm_routines (person_name, title, description, frequency, day_of_month_start, day_of_month_end, exclude_weekends) VALUES
('Miria', 'Contabilidade', 'Tarefas contábeis do início do mês.', 'monthly', 1, 5, false),
('Miria', 'Alelo', 'Gestão do Alelo.', 'monthly', 15, 20, false);

-- Miria Conditional
INSERT INTO public.crm_routines (person_name, title, description, frequency, exclude_weekends) VALUES
('Miria', 'Envio de Produtos aos Correios', 'Enviar pedidos pendentes aos Correios.', 'conditional', false);