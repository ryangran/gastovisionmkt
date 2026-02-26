-- Add barcode column to products table
ALTER TABLE public.products ADD COLUMN barcode text;

-- Create index for faster barcode lookups
CREATE INDEX idx_products_barcode ON public.products(barcode);