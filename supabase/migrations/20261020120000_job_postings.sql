-- Job postings for /jobs: admins write and publish them in the dashboard, everyone reads the
-- published ones that have not run out. Applications go by email or to an external link set per
-- posting; the site itself stores no applicant data.
CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  team text CHECK (char_length(team) <= 60),
  employment_type text NOT NULL DEFAULT 'freelance'
    CHECK (employment_type IN ('full_time', 'part_time', 'mini_job', 'freelance', 'internship', 'volunteer')),
  workplace text NOT NULL DEFAULT 'remote' CHECK (workplace IN ('remote', 'hybrid', 'onsite')),
  location text CHECK (char_length(location) <= 80),
  summary text CHECK (char_length(summary) <= 300),
  -- Plain text; tasks, profile and offer are one point per line
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 6000),
  tasks text NOT NULL DEFAULT '' CHECK (char_length(tasks) <= 4000),
  profile text NOT NULL DEFAULT '' CHECK (char_length(profile) <= 4000),
  offer text NOT NULL DEFAULT '' CHECK (char_length(offer) <= 4000),
  apply_email text CHECK (apply_email IS NULL OR (char_length(apply_email) <= 200 AND apply_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  apply_url text CHECK (apply_url IS NULL OR (char_length(apply_url) <= 500 AND apply_url ~ '^https://')),
  valid_through date,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_published ON public.job_postings (sort_order, published_at DESC) WHERE published;

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published job postings are public" ON public.job_postings;
CREATE POLICY "Published job postings are public"
  ON public.job_postings FOR SELECT
  TO anon, authenticated
  USING (
    (published AND (valid_through IS NULL OR valid_through >= (now() AT TIME ZONE 'Europe/Berlin')::date))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins manage job postings" ON public.job_postings;
CREATE POLICY "Admins manage job postings"
  ON public.job_postings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at on every change; published_at the first time a posting goes live (Google shows it as
-- the posting date, so taking it offline and back keeps the original date)
CREATE OR REPLACE FUNCTION public.stamp_job_posting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.published AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN
    NEW.published_at := OLD.published_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_job_posting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_job_posting ON public.job_postings;
CREATE TRIGGER stamp_job_posting
  BEFORE INSERT OR UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.stamp_job_posting();
