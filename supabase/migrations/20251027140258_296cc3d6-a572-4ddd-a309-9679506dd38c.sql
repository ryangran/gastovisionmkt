-- Add panel_type column to products table
ALTER TABLE public.products 
ADD COLUMN panel_type TEXT NOT NULL DEFAULT 'production' 
CHECK (panel_type IN ('production', 'admin'));

-- Add panel_type column to movements table
ALTER TABLE public.movements 
ADD COLUMN panel_type TEXT NOT NULL DEFAULT 'production' 
CHECK (panel_type IN ('production', 'admin'));

-- Create indexes for better query performance
CREATE INDEX idx_products_panel_type ON public.products(panel_type);
CREATE INDEX idx_movements_panel_type ON public.movements(panel_type);

-- Update RLS policies to be more specific
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on movements" ON public.movements;

-- New policies that maintain full access but are better documented
CREATE POLICY "Allow all operations on products by panel" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on movements by panel" ON public.movements
  FOR ALL USING (true) WITH CHECK (true);