-- Sicherheits-Fixes aus dem Security-Review vom 2026-09-25

-- ============ 1) E-Mail-Queue-RPCs nur für service_role ============
-- 20260321091827_email_infra hat EXECUTE nur PUBLIC entzogen. Supabase vergibt EXECUTE auf
-- neue Funktionen aber zusätzlich direkt an anon und authenticated. Dadurch konnte jeder mit
-- dem anon-Key die Queues lesen (Login- und Reset-Links in auth_emails) und eigene Mails
-- über noreply@criticore.cc verschicken lassen.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- ============ 2) API-Keys: Tier, Limits und Zähler schützen ============
-- Über die RLS-Policies konnten Nutzer bei eigenen Keys tier, rate_limit und requests_today
-- selbst setzen und beliebig viele Keys anlegen.
-- Bewusst SECURITY INVOKER: current_user ist dann die Rolle des Requests. service_role
-- (Zähler in den API-Functions), SQL-Editor und SECURITY-DEFINER-Funktionen bleiben frei.
CREATE OR REPLACE FUNCTION public.protect_api_key_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM public.api_keys WHERE user_id = NEW.user_id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 API keys per account';
    END IF;
    NEW.tier := 'free';
    NEW.rate_limit := 100;
    NEW.api_version := 'v2';
    NEW.active := true;
    NEW.requests_today := 0;
    NEW.requests_total := 0;
    NEW.last_request_at := NULL;
    NEW.last_reset_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    -- Nutzer dürfen nur den Namen ändern und den Key deaktivieren, nicht reaktivieren
    NEW.user_id := OLD.user_id;
    NEW.key_hash := OLD.key_hash;
    NEW.key_prefix := OLD.key_prefix;
    NEW.tier := OLD.tier;
    NEW.rate_limit := OLD.rate_limit;
    NEW.api_version := OLD.api_version;
    NEW.active := OLD.active AND NEW.active;
    NEW.requests_today := OLD.requests_today;
    NEW.requests_total := OLD.requests_total;
    NEW.last_request_at := OLD.last_request_at;
    NEW.last_reset_at := OLD.last_reset_at;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_api_key_privileged_fields_trg ON public.api_keys;
CREATE TRIGGER protect_api_key_privileged_fields_trg
  BEFORE INSERT OR UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.protect_api_key_privileged_fields();

-- ============ 3) Badges: Nutzer dürfen nur "seen" setzen ============
-- Die Policy "Users can update own badges (mark seen)" erlaubte auch, badge_id zu ändern
-- und sich so beliebige Badges zu geben.
CREATE OR REPLACE FUNCTION public.protect_user_badge_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.badge_id := OLD.badge_id;
  NEW.earned_at := OLD.earned_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_badge_fields_trg ON public.user_badges;
CREATE TRIGGER protect_user_badge_fields_trg
  BEFORE UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_badge_fields();
