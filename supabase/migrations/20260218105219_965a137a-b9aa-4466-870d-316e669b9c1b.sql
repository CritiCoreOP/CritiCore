
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Admins can view all support tickets" ON public.support_tickets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Admins can update support tickets" ON public.support_tickets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
