
-- Table to store email OTP codes for custom verification
CREATE TABLE public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access this table
-- No public policies needed - all access is via edge functions with service_role key

-- Index for quick lookups
CREATE INDEX idx_email_otps_email_code ON public.email_otps (email, otp_code, used);

-- Auto-cleanup: delete expired OTPs older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.email_otps WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_expired_otps
AFTER INSERT ON public.email_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
