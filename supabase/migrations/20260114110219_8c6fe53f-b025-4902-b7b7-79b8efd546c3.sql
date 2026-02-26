-- Create table for stock requests (real-time approval workflow)
CREATE TABLE public.stock_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_quantity NUMERIC,
  supervisor_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable Row Level Security
ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view stock requests"
  ON public.stock_requests
  FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert stock requests"
  ON public.stock_requests
  FOR INSERT
  WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can update stock requests"
  ON public.stock_requests
  FOR UPDATE
  USING (is_authenticated_user())
  WITH CHECK (is_authenticated_user());

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_requests;

-- Create index for faster queries on pending requests
CREATE INDEX idx_stock_requests_status ON public.stock_requests(status);
CREATE INDEX idx_stock_requests_expires_at ON public.stock_requests(expires_at);