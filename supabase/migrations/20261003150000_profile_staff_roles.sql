-- Redaktionsfunktionen im Profil: Chefredaktion, Ressortleitung je Ressort, Autor.
-- Angezeigt in der Artikel-Byline, der Autorenbox unter Artikeln und auf dem öffentlichen Profil.
-- Setzen dürfen sie nur Admins (über die App), der SQL-Editor oder die Service-Role, nie der Nutzer selbst.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_roles text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_staff_roles_known;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_staff_roles_known CHECK (
  staff_roles <@ ARRAY[
    'editor_in_chief',
    'desk_lead_movies', 'desk_lead_series', 'desk_lead_anime', 'desk_lead_games', 'desk_lead_news',
    'author'
  ]::text[]
);

-- Bisheriger Schutz für status, is_official und ban_reason bleibt unverändert, staff_roles kommt dazu.
-- auth.role() statt current_user: Die Funktion läuft als SECURITY DEFINER, current_user ist dann immer
-- der Eigentümer. auth.role() ist 'anon'/'authenticated' bei Nutzer-Requests und leer im SQL-Editor.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    NEW.staff_roles := CASE WHEN TG_OP = 'UPDATE' THEN OLD.staff_roles ELSE '{}'::text[] END;
  END IF;

  RETURN NEW;
END;
$$;

-- Simon Althoff: Chefredaktion, Ressortleitung Serien und Anime, Autor
UPDATE public.profiles
SET staff_roles = ARRAY['editor_in_chief', 'desk_lead_series', 'desk_lead_anime', 'author']
WHERE user_id = 'bfd5af0f-bca8-4ed2-9e6f-e0b3a6fe87a8';
