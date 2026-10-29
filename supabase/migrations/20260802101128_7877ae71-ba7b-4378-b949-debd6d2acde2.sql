-- 1) profiles: hide ban_reason from public / other users via column privileges
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, user_id, display_name, avatar_url, bio, status, created_at, updated_at,
  is_official, username, username_changed_at, display_name_changed_at,
  onboarding_completed_at, post_karma, comment_karma, forum_onboarded_at,
  anime_title_language
) ON public.profiles TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_ban_reasons()
RETURNS TABLE(user_id uuid, ban_reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.ban_reason
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin') AND p.ban_reason IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.admin_list_ban_reasons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_ban_reasons() TO authenticated, service_role;

-- 2) user_badges: no self-awarding; server validates achievement criteria
DROP POLICY IF EXISTS "System can insert badges" ON public.user_badges;

CREATE POLICY "Admins can award badges"
ON public.user_badges
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_badges()
RETURNS TABLE(badge_id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_review_count integer;
  v_list_count integer;
  v_watchlist_count integer;
  v_post_count integer;
  v_karma integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*) INTO v_review_count FROM public.reviews r WHERE r.user_id = v_user;
  SELECT count(*) INTO v_list_count FROM public.custom_lists c WHERE c.user_id = v_user;
  SELECT count(*) INTO v_watchlist_count FROM public.user_watchlist w WHERE w.user_id = v_user;
  SELECT count(*) INTO v_post_count FROM public.forum_posts fp WHERE fp.user_id = v_user;
  SELECT COALESCE(p.post_karma, 0) + COALESCE(p.comment_karma, 0) INTO v_karma
  FROM public.profiles p WHERE p.user_id = v_user;
  v_karma := COALESCE(v_karma, 0);

  RETURN QUERY
  WITH eligible AS (
    SELECT d.id, d.slug
    FROM public.badge_definitions d
    WHERE d.condition_value IS NOT NULL
      AND CASE d.condition_type
            WHEN 'review_count' THEN v_review_count >= d.condition_value
            WHEN 'list_count' THEN v_list_count >= d.condition_value
            WHEN 'watchlist_count' THEN v_watchlist_count >= d.condition_value
            WHEN 'post_count' THEN v_post_count >= d.condition_value
            WHEN 'karma_total' THEN v_karma >= d.condition_value
            ELSE false
          END
      AND NOT EXISTS (
        SELECT 1 FROM public.user_badges ub
        WHERE ub.user_id = v_user AND ub.badge_id = d.id
      )
  ), inserted AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT v_user, e.id FROM eligible e
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING user_badges.badge_id
  )
  SELECT i.badge_id, d.slug
  FROM inserted i
  JOIN public.badge_definitions d ON d.id = i.badge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_badges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_badges() TO authenticated, service_role;

-- 3) user_warnings: users may only acknowledge, not rewrite the warning
CREATE OR REPLACE FUNCTION public.protect_user_warning_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.issued_by := OLD.issued_by;
  NEW.category := OLD.category;
  NEW.message := OLD.message;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_warning_fields ON public.user_warnings;
CREATE TRIGGER protect_user_warning_fields
BEFORE UPDATE ON public.user_warnings
FOR EACH ROW EXECUTE FUNCTION public.protect_user_warning_fields();