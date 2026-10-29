
-- Reports table for content/user reporting
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL, -- 'user', 'comment', 'article', 'review'
  target_id text NOT NULL,
  reason text NOT NULL, -- 'spam', 'beleidigung', 'fake_news', 'sonstiges'
  description text,
  status text NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'ignored'
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Authenticated users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update reports (resolve/ignore)
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin update policy for profiles (for banning)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policy for comments
CREATE POLICY "Admins can delete any comment"
ON public.comments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin update policy for articles (hide/feature)
CREATE POLICY "Admins can update any article"
ON public.articles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policy for articles
CREATE POLICY "Admins can delete any article"
ON public.articles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin delete policy for reviews
CREATE POLICY "Admins can delete any review"
ON public.reviews FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
