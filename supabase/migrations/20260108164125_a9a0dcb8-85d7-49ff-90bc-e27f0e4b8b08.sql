-- Helper to safely read current user's email in RLS without direct auth.users access
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email::text
  FROM auth.users au
  WHERE au.id = auth.uid()
$$;

-- Fix RLS policy to avoid direct references to auth.users
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_page_permissions;

CREATE POLICY "Users can view their own permissions"
ON public.user_page_permissions
FOR SELECT
USING (user_email = public.get_my_email());