
CREATE POLICY "Users can delete own pending applications"
ON public.api_applications
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');
