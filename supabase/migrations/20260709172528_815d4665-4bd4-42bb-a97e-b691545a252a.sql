-- Remove the permissive path-only SELECT policy on rw-images
DROP POLICY IF EXISTS "RW images accessible by direct path" ON storage.objects;

-- Allow reads only for the uploader (first path segment = their user id) or for
-- users who share at least one Redaim workspace with the uploader.
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