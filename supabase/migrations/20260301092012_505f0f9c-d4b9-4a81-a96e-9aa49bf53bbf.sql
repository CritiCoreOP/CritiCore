
CREATE TABLE public.rw_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.rw_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_date date NOT NULL,
  meeting_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rw_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view meetings" ON public.rw_meetings
  FOR SELECT USING (
    workspace_id IS NULL AND auth.uid() = created_by
    OR workspace_id IS NOT NULL AND is_rw_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Auth users can create meetings" ON public.rw_meetings
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update meetings" ON public.rw_meetings
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete meetings" ON public.rw_meetings
  FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_rw_meetings_updated_at
  BEFORE UPDATE ON public.rw_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
