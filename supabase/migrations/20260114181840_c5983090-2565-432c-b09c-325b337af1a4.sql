-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  page TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all logs
CREATE POLICY "Admin users can view all logs"
  ON public.activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert logs
CREATE POLICY "Authenticated users can insert logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (is_authenticated_user());

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_email ON public.activity_logs(user_email);