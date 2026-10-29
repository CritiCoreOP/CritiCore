CREATE POLICY "Admins can create articles"
ON public.articles
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = user_id) AND has_role(auth.uid(), 'admin'::app_role)
);