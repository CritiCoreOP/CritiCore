
-- Deny all direct access to email_otps from clients
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
CREATE POLICY "No direct select on email_otps"
  ON public.email_otps FOR SELECT
  USING (false);

CREATE POLICY "No direct insert on email_otps"
  ON public.email_otps FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update on email_otps"
  ON public.email_otps FOR UPDATE
  USING (false);

CREATE POLICY "No direct delete on email_otps"
  ON public.email_otps FOR DELETE
  USING (false);
