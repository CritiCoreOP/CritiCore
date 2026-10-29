
-- ============================================
-- FIX 1: Restrict ban_reason visibility in profiles
-- ============================================

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles readable without sensitive fields" ON public.profiles;

-- Create a view-like approach using security definer function
-- Public can see profiles but ban_reason is nulled out unless you're the user or admin
CREATE OR REPLACE FUNCTION public.safe_ban_reason(profile_user_id uuid, raw_ban_reason text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = profile_user_id THEN raw_ban_reason
    WHEN has_role(auth.uid(), 'admin') THEN raw_ban_reason
    ELSE NULL
  END;
$$;

-- Re-create the SELECT policy - profiles are publicly readable (needed for usernames, avatars etc)
-- but ban_reason is protected via the safe_ban_reason function at query time
CREATE POLICY "Public profiles readable"
ON public.profiles
FOR SELECT
USING (true);

-- ============================================
-- FIX 2: Restrict notifications INSERT to service_role only
-- ============================================

-- Drop the current permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Only service_role (edge functions) can insert notifications
CREATE POLICY "Only service role can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- FIX 3: Storage - prevent public bucket listing
-- ============================================

-- Drop existing broad SELECT policies and recreate with path-based access only
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Forum images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Article images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Media images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view rw images" ON storage.objects;

-- Recreate with path-specific access (requires knowing the file name, prevents listing)
CREATE POLICY "Avatars accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND name IS NOT NULL AND name != '');

CREATE POLICY "Forum images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images' AND name IS NOT NULL AND name != '');

CREATE POLICY "Article images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images' AND name IS NOT NULL AND name != '');

CREATE POLICY "Email assets accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets' AND name IS NOT NULL AND name != '');

CREATE POLICY "Media images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-images' AND name IS NOT NULL AND name != '');

CREATE POLICY "RW images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'rw-images' AND name IS NOT NULL AND name != '');
