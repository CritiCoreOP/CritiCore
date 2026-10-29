
-- Create user_warnings table
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  issued_by uuid NOT NULL,
  category text NOT NULL,
  message text,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all warnings"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert warnings"
  ON public.user_warnings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = issued_by);

CREATE POLICY "Admins can delete warnings"
  ON public.user_warnings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view own warnings
CREATE POLICY "Users can view own warnings"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can acknowledge own warnings
CREATE POLICY "Users can acknowledge own warnings"
  ON public.user_warnings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
