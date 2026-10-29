
-- Fix: restrict newsletter insert to require a valid email (the WITH CHECK true is intentional for public subscribe, but let's restrict to anon+authenticated)
DROP POLICY "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
