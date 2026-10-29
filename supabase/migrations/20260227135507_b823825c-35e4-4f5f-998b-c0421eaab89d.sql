
-- Drop the overly permissive ALL policy
DROP POLICY "Service role can manage translations" ON public.article_translations;

-- Only press/admin users can insert/update (edge function with service_role bypasses RLS anyway)
CREATE POLICY "Press can insert translations"
  ON public.article_translations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'press'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Press can update translations"
  ON public.article_translations FOR UPDATE
  USING (has_role(auth.uid(), 'press'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete translations"
  ON public.article_translations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
