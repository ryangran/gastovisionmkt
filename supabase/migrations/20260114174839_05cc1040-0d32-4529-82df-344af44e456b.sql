-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin users can insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin users can update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin users can delete purchase orders" ON public.purchase_orders;

-- Create new permissive policies
CREATE POLICY "Authenticated users can view purchase orders" 
ON public.purchase_orders 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin users can insert purchase orders" 
ON public.purchase_orders 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update purchase orders" 
ON public.purchase_orders 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can delete purchase orders" 
ON public.purchase_orders 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));