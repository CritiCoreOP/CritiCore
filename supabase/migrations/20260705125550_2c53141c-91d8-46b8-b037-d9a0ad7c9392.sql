DROP FUNCTION IF EXISTS public.explore_media_feed(integer, integer);

CREATE OR REPLACE FUNCTION public.explore_media_feed(
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_media_type text DEFAULT NULL
)
RETURNS TABLE (
  media_id text,
  media_type text,
  title text,
  poster_path text,
  score numeric,
  release_date date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH media_universe AS (
    SELECT u.media_id, u.media_type, MIN(u.created_at) AS created_at
    FROM (
      SELECT media_id, media_type, created_at FROM public.media_metadata
      UNION ALL
      SELECT media_id, media_type, created_at FROM public.media_images WHERE status = 'approved'
      UNION ALL
      SELECT media_id, media_type, created_at FROM public.media_releases
    ) u
    WHERE u.media_id IS NOT NULL AND u.media_type IS NOT NULL
      AND (p_media_type IS NULL OR u.media_type = p_media_type)
    GROUP BY u.media_id, u.media_type
  ),
  meta AS (
    SELECT
      media_id,
      media_type,
      MAX(meta_value) FILTER (WHERE meta_key IN ('title', 'name')) AS title,
      MAX(meta_value) FILTER (WHERE meta_key IN ('poster_path', 'poster', 'poster_url', 'image')) AS poster_path,
      MAX(meta_value::numeric) FILTER (WHERE meta_key IN ('score', 'vote_average', 'rating') AND meta_value ~ '^[0-9]+(\.[0-9]+)?$') AS score
    FROM public.media_metadata
    GROUP BY media_id, media_type
  ),
  poster_img AS (
    SELECT DISTINCT ON (media_id, media_type) media_id, media_type, storage_path
    FROM public.media_images
    WHERE status = 'approved' AND image_type IN ('poster', 'cover')
    ORDER BY media_id, media_type, created_at DESC
  ),
  rel AS (
    SELECT media_id, media_type, MIN(release_date) AS release_date
    FROM public.media_releases
    GROUP BY media_id, media_type
  )
  SELECT
    mu.media_id,
    mu.media_type,
    m.title,
    COALESCE(m.poster_path, pi.storage_path) AS poster_path,
    m.score,
    r.release_date,
    mu.created_at
  FROM media_universe mu
  LEFT JOIN meta m ON m.media_id = mu.media_id AND m.media_type = mu.media_type
  LEFT JOIN poster_img pi ON pi.media_id = mu.media_id AND pi.media_type = mu.media_type
  LEFT JOIN rel r ON r.media_id = mu.media_id AND r.media_type = mu.media_type
  ORDER BY mu.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 24), 0)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.explore_media_feed(integer, integer, text) TO anon, authenticated, service_role;