-- Create decision_history table to track all actions taken
CREATE TABLE public.decision_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'purchase_order', 'create_task', 'ignore', 'open_pricing'
  block_type TEXT NOT NULL, -- 'buy_now', 'adjust_price', 'monitor'
  justification TEXT,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view decision history"
ON public.decision_history FOR SELECT
USING (is_authenticated_user());

CREATE POLICY "Admin users can insert decision history"
ON public.decision_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_history;