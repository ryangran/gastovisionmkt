-- Create table for user page permissions
CREATE TABLE public.user_page_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  page_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_email, page_path)
);

-- Enable Row Level Security
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin users can view all permissions"
ON public.user_page_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can insert permissions"
ON public.user_page_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update permissions"
ON public.user_page_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can delete permissions"
ON public.user_page_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_page_permissions
FOR SELECT
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));