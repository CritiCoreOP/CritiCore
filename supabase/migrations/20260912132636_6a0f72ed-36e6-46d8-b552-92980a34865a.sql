DROP POLICY IF EXISTS "Auth users can create meetings" ON public.rw_meetings;
CREATE POLICY "Auth users can create meetings"
ON public.rw_meetings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    workspace_id IS NULL
    OR public.is_rw_member(auth.uid(), workspace_id)
  )
);