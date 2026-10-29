CREATE POLICY "Users can delete own unverified press profile"
ON public.press_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND verified = false);