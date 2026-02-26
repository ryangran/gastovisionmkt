-- Create company_memory table
CREATE TABLE public.company_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT NOT NULL,
  
  -- Automatic fields
  origin TEXT NOT NULL, -- 'central_decisoes', 'pedido_compra', 'precificacao', 'estoque', 'manual'
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  sku TEXT,
  channel TEXT, -- 'mercado_livre', 'amazon', 'shopee', 'magalu', 'site', etc.
  
  -- Required fields
  category TEXT NOT NULL, -- 'compra', 'preco', 'producao', 'marketing', 'pausa', 'ajuste', 'estrategia'
  summary TEXT NOT NULL, -- Max 200 chars, the quick decision summary
  
  -- Optional fields
  reason TEXT, -- Short reason
  notes TEXT, -- Additional observation
  
  -- Metadata
  related_id UUID, -- ID of related record (purchase_order, decision_history, etc.)
  related_type TEXT -- 'purchase_order', 'decision', 'platform_cost', etc.
);

-- Enable RLS
ALTER TABLE public.company_memory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view company memory"
ON public.company_memory FOR SELECT
USING (is_authenticated_user());

CREATE POLICY "Admin users can insert company memory"
ON public.company_memory FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update company memory"
ON public.company_memory FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can delete company memory"
ON public.company_memory FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_company_memory_product ON public.company_memory(product_id);
CREATE INDEX idx_company_memory_category ON public.company_memory(category);
CREATE INDEX idx_company_memory_created ON public.company_memory(created_at DESC);
CREATE INDEX idx_company_memory_origin ON public.company_memory(origin);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_memory;