-- 1. poll_votes: anonymous voting is unused (the app requires login to vote).
-- Require user_id so the (auth.uid() = user_id) policy can never be bypassed with NULL.
DELETE FROM public.poll_votes WHERE user_id IS NULL;
ALTER TABLE public.poll_votes ALTER COLUMN user_id SET NOT NULL;

-- 2. rw_invites: stop exposing the plaintext token via table SELECT.
-- Remove column-level read access to token for client roles...
REVOKE SELECT ON public.rw_invites FROM authenticated;
GRANT SELECT (id, workspace_id, role, email, invited_by, accepted, created_at, expires_at)
  ON public.rw_invites TO authenticated;
REVOKE SELECT ON public.rw_invites FROM anon;

-- ...and provide a secure server-side function to create an invite and return the token once.
CREATE OR REPLACE FUNCTION public.create_rw_invite(p_workspace_id uuid, p_role text, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.rw_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT public.is_rw_role(auth.uid(), p_workspace_id, 'owner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_role NOT IN ('user', 'press') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  INSERT INTO public.rw_invites (workspace_id, role, email, invited_by)
  VALUES (p_workspace_id, p_role, NULLIF(p_email, ''), auth.uid())
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object('success', true, 'token', v_invite.token, 'id', v_invite.id);
END;
$$;

-- 3. Storage: add folder-scoped UPDATE policies for the three buckets (mirrors INSERT/DELETE).
CREATE POLICY "Users can update own article images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own forum images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'forum-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'forum-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own rw images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rw-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'rw-images' AND (auth.uid())::text = (storage.foldername(name))[1]);