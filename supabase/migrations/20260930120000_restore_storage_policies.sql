-- The database was cloned from Lovable Cloud with a dump that did not include policies on
-- storage.objects. RLS is on, so every upload (article images, avatars, media gallery,
-- social assets, Redaim Workspace) was rejected. This restores the final state of the
-- earlier migrations (subtitle-files stays gone, see 20260422162524). Idempotent.

-- avatars
DROP POLICY IF EXISTS "Avatars accessible by direct path" ON storage.objects;
CREATE POLICY "Avatars accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND name IS NOT NULL AND name != '');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- article-images
DROP POLICY IF EXISTS "Article images accessible by direct path" ON storage.objects;
CREATE POLICY "Article images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images' AND name IS NOT NULL AND name != '');

DROP POLICY IF EXISTS "Users can upload article images to own folder" ON storage.objects;
CREATE POLICY "Users can upload article images to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own article images" ON storage.objects;
CREATE POLICY "Users can update own article images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own article images" ON storage.objects;
CREATE POLICY "Users can delete own article images"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- media-images
DROP POLICY IF EXISTS "Media images accessible by direct path" ON storage.objects;
CREATE POLICY "Media images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-images' AND name IS NOT NULL AND name != '');

DROP POLICY IF EXISTS "Users can upload media images to own folder" ON storage.objects;
CREATE POLICY "Users can upload media images to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own media images" ON storage.objects;
CREATE POLICY "Users can delete own media images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete any media image" ON storage.objects;
CREATE POLICY "Admins can delete any media image"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media-images' AND public.has_role(auth.uid(), 'admin'));

-- forum-images
DROP POLICY IF EXISTS "Forum images accessible by direct path" ON storage.objects;
CREATE POLICY "Forum images accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images' AND name IS NOT NULL AND name != '');

DROP POLICY IF EXISTS "Users can upload forum images to own folder" ON storage.objects;
CREATE POLICY "Users can upload forum images to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'forum-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own forum images" ON storage.objects;
CREATE POLICY "Users can update own forum images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'forum-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'forum-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own forum images" ON storage.objects;
CREATE POLICY "Users can delete own forum images"
ON storage.objects FOR DELETE
USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- email-assets (read only, uploaded by admins through the dashboard)
DROP POLICY IF EXISTS "Email assets accessible by direct path" ON storage.objects;
CREATE POLICY "Email assets accessible by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets' AND name IS NOT NULL AND name != '');

-- rw-images (Redaim Workspace, private bucket)
DROP POLICY IF EXISTS "RW images readable by workspace members" ON storage.objects;
CREATE POLICY "RW images readable by workspace members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rw-images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.rw_members m_self
      JOIN public.rw_members m_owner ON m_owner.workspace_id = m_self.workspace_id
      WHERE m_self.user_id = auth.uid()
        AND (m_owner.user_id)::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload rw images" ON storage.objects;
CREATE POLICY "Authenticated users can upload rw images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rw-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own rw images" ON storage.objects;
CREATE POLICY "Users can update own rw images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rw-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'rw-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own rw images" ON storage.objects;
CREATE POLICY "Users can delete own rw images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rw-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- social-assets (private bucket)
DROP POLICY IF EXISTS "Social assets own read" ON storage.objects;
CREATE POLICY "Social assets own read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Social assets own insert" ON storage.objects;
CREATE POLICY "Social assets own insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Social assets own update" ON storage.objects;
CREATE POLICY "Social assets own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Social assets own delete" ON storage.objects;
CREATE POLICY "Social assets own delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
