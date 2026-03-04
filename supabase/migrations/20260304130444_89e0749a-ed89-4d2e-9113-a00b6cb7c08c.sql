
-- Function to get all users with their purchase data (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_with_purchases()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  purchase_id uuid,
  plan_type text,
  status text,
  purchased_at timestamptz,
  expires_at timestamptz,
  product_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    p.id as purchase_id,
    p.plan_type,
    p.status,
    p.purchased_at,
    p.expires_at,
    p.product_name
  FROM auth.users au
  LEFT JOIN public.purchases p ON p.user_email = au.email::text
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  ORDER BY au.created_at DESC;
$$;
