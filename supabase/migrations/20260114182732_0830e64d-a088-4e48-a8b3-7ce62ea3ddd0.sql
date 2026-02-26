-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Admin users can view all logs" ON public.activity_logs;

-- Create new permissive policy for all authenticated users to view all logs
CREATE POLICY "Authenticated users can view all logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (true);