-- Release reminders: on the page of an upcoming game, film, series or anime people can ask for a
-- mail on release day. release_subscriptions and its policies came with the dump but nothing used
-- them. The function release-reminders needs to know what to write without asking TMDB, IGDB or
-- AniList for every row, so the subscription keeps title, picture, page and release day; the
-- detail page refreshes the day when it moves.
ALTER TABLE public.release_subscriptions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS release_date date,
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

ALTER TABLE public.release_subscriptions DROP CONSTRAINT IF EXISTS release_subscriptions_fields_check;
ALTER TABLE public.release_subscriptions
  ADD CONSTRAINT release_subscriptions_fields_check CHECK (
    media_type IN ('game', 'movie', 'series', 'anime')
    AND char_length(media_id) <= 40
    AND char_length(coalesce(title, '')) <= 300
    AND char_length(coalesce(image_url, '')) <= 1000
    AND coalesce(path, '/') ~ '^/[a-z]+/[0-9]+$'
    AND lang IN ('de', 'en', 'fr', 'es', 'th')
  );

-- The daily job looks for today's releases that have not been mailed yet
CREATE INDEX IF NOT EXISTS idx_release_subs_due
  ON public.release_subscriptions (release_date)
  WHERE notified_at IS NULL;

-- A new release day means a new reminder; people cannot mark their own rows as sent
CREATE OR REPLACE FUNCTION public.reset_release_reminder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- The release-reminders function (service_role) sets notified_at; signed-in people cannot
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.release_date IS DISTINCT FROM OLD.release_date THEN
      NEW.notified_at := NULL;
    ELSE
      NEW.notified_at := OLD.notified_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_release_reminder() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reset_release_reminder ON public.release_subscriptions;
CREATE TRIGGER reset_release_reminder
  BEFORE UPDATE ON public.release_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.reset_release_reminder();
