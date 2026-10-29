
-- 1) Protect forum_communities.is_official from non-admin writes
CREATE OR REPLACE FUNCTION public.protect_forum_community_privileged_fields()
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
    NEW.is_official := false;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.is_official := OLD.is_official;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_forum_community_privileged_fields ON public.forum_communities;
CREATE TRIGGER protect_forum_community_privileged_fields
BEFORE INSERT OR UPDATE ON public.forum_communities
FOR EACH ROW EXECUTE FUNCTION public.protect_forum_community_privileged_fields();

-- 2) Prevent self-assignment of elevated roles in forum_community_members
CREATE OR REPLACE FUNCTION public.protect_forum_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT created_by INTO v_creator FROM public.forum_communities WHERE id = NEW.community_id;

  IF TG_OP = 'INSERT' THEN
    -- The community creator may take the initial 'owner' role; everyone else is forced to 'member'
    IF NEW.user_id = v_creator AND NEW.role IN ('owner','moderator','member') THEN
      RETURN NEW;
    END IF;
    NEW.role := 'member';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admins may not change roles
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_forum_member_role ON public.forum_community_members;
CREATE TRIGGER protect_forum_member_role
BEFORE INSERT OR UPDATE ON public.forum_community_members
FOR EACH ROW EXECUTE FUNCTION public.protect_forum_member_role();
