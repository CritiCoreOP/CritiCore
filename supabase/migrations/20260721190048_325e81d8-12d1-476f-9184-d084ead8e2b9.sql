
-- 1. Add anime_title_language preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anime_title_language text NOT NULL DEFAULT 'english'
    CHECK (anime_title_language IN ('romaji', 'english', 'native'));

-- 2. RPC to sync AniList media into media_metadata + media_releases
CREATE OR REPLACE FUNCTION public.sync_anilist_media(p_anilist_id integer, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media_id text := 'anilist_' || p_anilist_id::text;
  v_media_type text := 'anime';
  v_release_date date;
  v_key text;
  v_val text;
  v_pairs jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Build a flat key/value map from payload
  v_pairs := jsonb_build_object(
    'title', COALESCE(p_payload->'title'->>'english', p_payload->'title'->>'romaji', p_payload->'title'->>'native'),
    'title_romaji', p_payload->'title'->>'romaji',
    'title_english', p_payload->'title'->>'english',
    'title_native', p_payload->'title'->>'native',
    'description', p_payload->>'description',
    'poster_path', p_payload->'coverImage'->>'extraLarge',
    'banner_path', p_payload->>'bannerImage',
    'score', CASE WHEN (p_payload->>'averageScore') ~ '^[0-9]+$'
                  THEN ((p_payload->>'averageScore')::numeric / 10)::text
                  ELSE NULL END,
    'popularity', p_payload->>'popularity',
    'episodes', p_payload->>'episodes',
    'duration', p_payload->>'duration',
    'season', p_payload->>'season',
    'season_year', p_payload->>'seasonYear',
    'status', p_payload->>'status',
    'format', p_payload->>'format',
    'source', p_payload->>'source',
    'genres', p_payload->'genres',
    'studios', p_payload->'studios',
    'trailer_url', CASE
      WHEN (p_payload->'trailer'->>'site') = 'youtube'
        AND (p_payload->'trailer'->>'id') IS NOT NULL
      THEN 'https://www.youtube.com/watch?v=' || (p_payload->'trailer'->>'id')
      ELSE NULL END,
    'anilist_url', p_payload->>'siteUrl',
    'anilist_id', p_anilist_id::text
  );

  -- Upsert each non-null field
  FOR v_key, v_val IN
    SELECT k, CASE WHEN jsonb_typeof(value) IN ('object','array') THEN value::text ELSE value#>>'{}' END
    FROM jsonb_each(v_pairs) AS e(k, value)
    WHERE value IS NOT NULL AND value::text NOT IN ('null', '""')
  LOOP
    INSERT INTO public.media_metadata (media_id, media_type, meta_key, meta_value)
    VALUES (v_media_id, v_media_type, v_key, v_val)
    ON CONFLICT (media_id, media_type, meta_key)
      DO UPDATE SET meta_value = EXCLUDED.meta_value;
  END LOOP;

  -- Release date
  IF (p_payload->'startDate'->>'year') IS NOT NULL THEN
    BEGIN
      v_release_date := make_date(
        (p_payload->'startDate'->>'year')::int,
        COALESCE(NULLIF(p_payload->'startDate'->>'month','')::int, 1),
        COALESCE(NULLIF(p_payload->'startDate'->>'day','')::int, 1)
      );
      INSERT INTO public.media_releases (media_id, media_type, release_date)
      VALUES (v_media_id, v_media_type, v_release_date)
      ON CONFLICT (media_id, media_type) DO UPDATE SET release_date = EXCLUDED.release_date;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_anilist_media(integer, jsonb) TO authenticated, service_role;
