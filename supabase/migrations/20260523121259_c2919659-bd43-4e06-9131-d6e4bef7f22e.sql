
-- 1. activity_logs: replace hardcoded email admin with role-based check
DROP POLICY IF EXISTS "View logs based on email" ON public.activity_logs;
CREATE POLICY "View own logs or admin views all"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_email = public.get_my_email()
);

-- 2. push_subscriptions: scope policies to authenticated role explicitly
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (user_email = public.get_my_email());

CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_email = public.get_my_email());

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (user_email = public.get_my_email());

-- 3. Lock down SECURITY DEFINER functions that should not be public/auth-callable
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_users_with_purchases() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_registered_emails() FROM PUBLIC, anon;

-- Helpers used in RLS — revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_authenticated_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_purchases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registered_emails() TO authenticated;
