CREATE POLICY "Users can view own moderation logs"
ON public.moderation_logs
FOR SELECT
TO authenticated
USING (target_id = auth.uid()::text);