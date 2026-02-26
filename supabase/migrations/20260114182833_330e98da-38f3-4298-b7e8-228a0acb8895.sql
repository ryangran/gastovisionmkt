-- Drop current policy
DROP POLICY IF EXISTS "Authenticated users can view all logs" ON public.activity_logs;

-- Create new policy: bmscomercial19@gmail.com sees all, others see only their own
CREATE POLICY "View logs based on email"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  get_my_email() = 'bmscomercial19@gmail.com' 
  OR user_email = get_my_email()
);