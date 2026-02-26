-- Drop the existing simple table and create a more complete one for product costs
DROP TABLE IF EXISTS public.platform_costs;

-- Create comprehensive table for platform product costs
CREATE TABLE public.platform_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  item_number INTEGER,
  product_name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  additional_cost NUMERIC NOT NULL DEFAULT 0,
  sku TEXT,
  ean TEXT,
  weight NUMERIC,
  dimensions TEXT,
  profit_margin_percent NUMERIC,
  current_margin_value NUMERIC,
  stock INTEGER,
  sale_price NUMERIC,
  full_price NUMERIC,
  ad_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platform_costs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view platform costs" 
ON public.platform_costs 
FOR SELECT 
USING (is_authenticated_user());

CREATE POLICY "Admin users can insert platform costs" 
ON public.platform_costs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update platform costs" 
ON public.platform_costs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can delete platform costs" 
ON public.platform_costs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_platform_costs_updated_at
BEFORE UPDATE ON public.platform_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();