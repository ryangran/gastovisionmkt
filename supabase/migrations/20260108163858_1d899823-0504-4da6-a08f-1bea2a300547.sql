-- Create a secure function to list registered user emails (only for admins)
CREATE OR REPLACE FUNCTION public.get_registered_emails()
RETURNS TABLE (email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT au.email::text
  FROM auth.users au
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
$$;

-- Drop and recreate the policy that was causing issues
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_page_permissions;

CREATE POLICY "Users can view their own permissions"
ON public.user_page_permissions
FOR SELECT
USING (
  user_email = (
    SELECT au.email FROM auth.users au WHERE au.id = auth.uid()
  )
);