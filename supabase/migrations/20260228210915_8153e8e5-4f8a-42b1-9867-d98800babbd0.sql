
-- Drop all restrictive policies on rw_workspaces and recreate as permissive
DROP POLICY IF EXISTS "Auth users can create workspaces" ON public.rw_workspaces;
DROP POLICY IF EXISTS "Members can view workspaces" ON public.rw_workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON public.rw_workspaces;
DROP POLICY IF EXISTS "Owner can update workspace" ON public.rw_workspaces;

CREATE POLICY "Auth users can create workspaces" ON public.rw_workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members can view workspaces" ON public.rw_workspaces FOR SELECT TO authenticated USING (is_rw_member(auth.uid(), id));
CREATE POLICY "Owner can delete workspace" ON public.rw_workspaces FOR DELETE TO authenticated USING (is_rw_role(auth.uid(), id, 'owner'));
CREATE POLICY "Owner can update workspace" ON public.rw_workspaces FOR UPDATE TO authenticated USING (is_rw_role(auth.uid(), id, 'owner'));

-- Drop all restrictive policies on rw_members and recreate as permissive
DROP POLICY IF EXISTS "Members can view members" ON public.rw_members;
DROP POLICY IF EXISTS "Owner can add members" ON public.rw_members;
DROP POLICY IF EXISTS "Owner can remove members" ON public.rw_members;
DROP POLICY IF EXISTS "Owner can update members" ON public.rw_members;

CREATE POLICY "Members can view members" ON public.rw_members FOR SELECT TO authenticated USING (is_rw_member(auth.uid(), workspace_id));
CREATE POLICY "Owner can add members" ON public.rw_members FOR INSERT TO authenticated WITH CHECK (is_rw_role(auth.uid(), workspace_id, 'owner') OR auth.uid() = user_id);
CREATE POLICY "Owner can remove members" ON public.rw_members FOR DELETE TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner') OR auth.uid() = user_id);
CREATE POLICY "Owner can update members" ON public.rw_members FOR UPDATE TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner'));

-- Drop all restrictive policies on rw_pages and recreate as permissive
DROP POLICY IF EXISTS "Members can view pages" ON public.rw_pages;
DROP POLICY IF EXISTS "Owner and user can create pages" ON public.rw_pages;
DROP POLICY IF EXISTS "Owner and user can update pages" ON public.rw_pages;
DROP POLICY IF EXISTS "Owner can delete pages" ON public.rw_pages;

CREATE POLICY "Members can view pages" ON public.rw_pages FOR SELECT TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user') OR (is_rw_role(auth.uid(), workspace_id, 'press') AND is_public = true));
CREATE POLICY "Owner and user can create pages" ON public.rw_pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND (is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user')));
CREATE POLICY "Owner and user can update pages" ON public.rw_pages FOR UPDATE TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user'));
CREATE POLICY "Owner can delete pages" ON public.rw_pages FOR DELETE TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner') OR (is_rw_role(auth.uid(), workspace_id, 'user') AND auth.uid() = created_by));

-- Drop all restrictive policies on rw_invites and recreate as permissive
DROP POLICY IF EXISTS "Owner can create invites" ON public.rw_invites;
DROP POLICY IF EXISTS "Owner can delete invites" ON public.rw_invites;
DROP POLICY IF EXISTS "Owner can view invites" ON public.rw_invites;

CREATE POLICY "Owner can create invites" ON public.rw_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = invited_by AND is_rw_role(auth.uid(), workspace_id, 'owner'));
CREATE POLICY "Owner can delete invites" ON public.rw_invites FOR DELETE TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner'));
CREATE POLICY "Owner can view invites" ON public.rw_invites FOR SELECT TO authenticated USING (is_rw_role(auth.uid(), workspace_id, 'owner'));
