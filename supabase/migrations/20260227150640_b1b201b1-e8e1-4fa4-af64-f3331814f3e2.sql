
-- Tighten dmca_requests: require all NOT NULL fields to be non-empty
DROP POLICY "Anyone can submit DMCA requests" ON public.dmca_requests;
CREATE POLICY "Anyone can submit DMCA requests"
  ON public.dmca_requests FOR INSERT
  WITH CHECK (
    email IS NOT NULL AND length(email) > 0 AND length(email) <= 255
    AND full_name IS NOT NULL AND length(full_name) > 0 AND length(full_name) <= 200
    AND content_url IS NOT NULL AND length(content_url) > 0 AND length(content_url) <= 2000
    AND description IS NOT NULL AND length(description) > 0 AND length(description) <= 5000
    AND status = 'pending'
  );

-- Tighten newsletter_subscribers: require valid email and default state
DROP POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (
    email IS NOT NULL AND length(email) > 0 AND length(email) <= 255
    AND subscribed = true
  );

-- Tighten support_tickets: require non-empty fields and default status
DROP POLICY "Anyone can submit support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can submit support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    email IS NOT NULL AND length(email) > 0 AND length(email) <= 255
    AND name IS NOT NULL AND length(name) > 0 AND length(name) <= 200
    AND subject IS NOT NULL AND length(subject) > 0 AND length(subject) <= 300
    AND message IS NOT NULL AND length(message) > 0 AND length(message) <= 10000
    AND status = 'open'
  );
