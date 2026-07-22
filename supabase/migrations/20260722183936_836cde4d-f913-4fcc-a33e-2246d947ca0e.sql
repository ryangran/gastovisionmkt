
-- Scope admin write policies to authenticated role for defense in depth

-- company_memory
DROP POLICY IF EXISTS "Admin users can delete company memory" ON public.company_memory;
DROP POLICY IF EXISTS "Admin users can insert company memory" ON public.company_memory;
DROP POLICY IF EXISTS "Admin users can update company memory" ON public.company_memory;
CREATE POLICY "Admin users can delete company memory" ON public.company_memory
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can insert company memory" ON public.company_memory
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can update company memory" ON public.company_memory
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- crm_routines
DROP POLICY IF EXISTS "Admin users can delete routines" ON public.crm_routines;
DROP POLICY IF EXISTS "Admin users can insert routines" ON public.crm_routines;
DROP POLICY IF EXISTS "Admin users can update routines" ON public.crm_routines;
CREATE POLICY "Admin users can delete routines" ON public.crm_routines
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can insert routines" ON public.crm_routines
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can update routines" ON public.crm_routines
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- crm_tasks
DROP POLICY IF EXISTS "Admin users can delete crm tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Admin users can insert crm tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Admin users can update crm tasks" ON public.crm_tasks;
CREATE POLICY "Admin users can delete crm tasks" ON public.crm_tasks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can insert crm tasks" ON public.crm_tasks
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can update crm tasks" ON public.crm_tasks
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_page_permissions
DROP POLICY IF EXISTS "Admin users can delete permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Admin users can insert permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Admin users can update permissions" ON public.user_page_permissions;
CREATE POLICY "Admin users can delete permissions" ON public.user_page_permissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can insert permissions" ON public.user_page_permissions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can update permissions" ON public.user_page_permissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- platform_costs
DROP POLICY IF EXISTS "Admin users can delete platform costs" ON public.platform_costs;
DROP POLICY IF EXISTS "Admin users can insert platform costs" ON public.platform_costs;
DROP POLICY IF EXISTS "Admin users can update platform costs" ON public.platform_costs;
CREATE POLICY "Admin users can delete platform costs" ON public.platform_costs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can insert platform costs" ON public.platform_costs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can update platform costs" ON public.platform_costs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- decision_history: add missing UPDATE/DELETE policies for admins
CREATE POLICY "Admin users can update decision history" ON public.decision_history
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin users can delete decision history" ON public.decision_history
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
