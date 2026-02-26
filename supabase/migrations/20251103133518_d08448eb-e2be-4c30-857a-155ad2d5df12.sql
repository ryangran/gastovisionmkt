-- Add DELETE policy for settings table to allow admins to remove configuration
CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Standardize settings table policies to use has_role() function for consistency
-- Drop existing policies that use direct subquery
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

-- Recreate policies using has_role() function for consistency
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));