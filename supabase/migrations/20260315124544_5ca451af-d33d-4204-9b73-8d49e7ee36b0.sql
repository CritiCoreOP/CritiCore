
-- Add ban_reason to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;

-- Create banned_ips table
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  reason text,
  banned_by uuid NOT NULL,
  related_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(ip_address)
);

ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage banned IPs
CREATE POLICY "Admins can view banned IPs" ON public.banned_ips FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert banned IPs" ON public.banned_ips FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update banned IPs" ON public.banned_ips FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete banned IPs" ON public.banned_ips FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
-- Service role needs access for edge function checks
CREATE POLICY "Service role can read banned IPs" ON public.banned_ips FOR SELECT USING (auth.role() = 'service_role');
