-- Corrections to published articles have to be visible to readers (Pressekodex Ziffer 3): a note
-- what was changed, with the date, shown under the article. The date is set here and not by the
-- editor, so it always says when the note last changed and cannot be backdated.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS correction_note text,
  ADD COLUMN IF NOT EXISTS corrected_at timestamptz;

ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_correction_note_length;
ALTER TABLE public.articles
  ADD CONSTRAINT articles_correction_note_length CHECK (char_length(correction_note) <= 1000);

CREATE OR REPLACE FUNCTION public.stamp_article_correction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.correction_note := NULLIF(btrim(NEW.correction_note), '');
  IF TG_OP = 'INSERT' THEN
    NEW.corrected_at := CASE WHEN NEW.correction_note IS NULL THEN NULL ELSE now() END;
  ELSIF NEW.correction_note IS DISTINCT FROM OLD.correction_note THEN
    NEW.corrected_at := CASE WHEN NEW.correction_note IS NULL THEN NULL ELSE now() END;
  ELSE
    NEW.corrected_at := OLD.corrected_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_article_correction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_article_correction ON public.articles;
CREATE TRIGGER stamp_article_correction
  BEFORE INSERT OR UPDATE OF correction_note, corrected_at ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_article_correction();
