
-- Fix: Remove self-insert branch from rw_members INSERT policy
-- This prevents any authenticated user from joining any workspace without an invite

DROP POLICY IF EXISTS "Owner can add members" ON public.rw_members;

-- Only workspace owners can directly add members
CREATE POLICY "Owner can add members"
  ON public.rw_members FOR INSERT
  TO authenticated
  WITH CHECK (is_rw_role(auth.uid(), workspace_id, 'owner'));
