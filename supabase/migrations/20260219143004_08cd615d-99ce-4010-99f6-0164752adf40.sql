
-- Developer API applications table
CREATE TABLE public.api_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_name text NOT NULL,
  project_url text,
  use_case text NOT NULL,
  expected_requests text NOT NULL,
  agree_terms boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_applications ENABLE ROW LEVEL SECURITY;

-- Users can view own applications
CREATE POLICY "Users can view own applications"
  ON public.api_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
  ON public.api_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.api_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
  ON public.api_applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications"
  ON public.api_applications FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_api_applications_updated_at
  BEFORE UPDATE ON public.api_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
