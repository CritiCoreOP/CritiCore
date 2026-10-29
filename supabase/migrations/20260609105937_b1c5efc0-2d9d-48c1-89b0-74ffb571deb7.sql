
-- ============ PROFILES: protect status, is_official, ban_reason ============
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may set privileged fields freely
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'active';
    NEW.is_official := false;
    NEW.ban_reason := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.is_official := OLD.is_official;
    NEW.ban_reason := OLD.ban_reason;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- ============ PRESS PROFILES: protect verified, trusted ============
CREATE OR REPLACE FUNCTION public.protect_press_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.trusted := false;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.verified := OLD.verified;
    NEW.trusted := OLD.trusted;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_press_privileged_fields_trg ON public.press_profiles;
CREATE TRIGGER protect_press_privileged_fields_trg
  BEFORE INSERT OR UPDATE ON public.press_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_press_privileged_fields();

-- ============ REVIEWS: derive is_critic_review server-side ============
CREATE OR REPLACE FUNCTION public.enforce_critic_review_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins keep whatever value they set
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Otherwise the critic flag is only true if the author has a verified press profile
  NEW.is_critic_review := EXISTS (
    SELECT 1 FROM public.press_profiles
    WHERE user_id = NEW.user_id AND verified = true
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_critic_review_flag_trg ON public.reviews;
CREATE TRIGGER enforce_critic_review_flag_trg
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_critic_review_flag();
