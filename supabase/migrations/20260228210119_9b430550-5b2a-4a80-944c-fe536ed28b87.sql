
-- Tables first
CREATE TABLE public.rw_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '📁',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rw_workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.rw_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.rw_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.rw_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb DEFAULT '{}',
  parent_id uuid REFERENCES public.rw_pages(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  icon text DEFAULT '📄',
  is_public boolean NOT NULL DEFAULT false,
  cover_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rw_pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rw_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.rw_workspaces(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  role text NOT NULL DEFAULT 'user',
  email text,
  invited_by uuid NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(token)
);
ALTER TABLE public.rw_invites ENABLE ROW LEVEL SECURITY;

-- Realtime for pages
ALTER PUBLICATION supabase_realtime ADD TABLE public.rw_pages;

-- Triggers
CREATE TRIGGER update_rw_workspaces_updated_at BEFORE UPDATE ON public.rw_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rw_pages_updated_at BEFORE UPDATE ON public.rw_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer functions
CREATE OR REPLACE FUNCTION public.is_rw_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_members WHERE user_id = _user_id AND workspace_id = _workspace_id)
$$;

CREATE OR REPLACE FUNCTION public.is_rw_role(_user_id uuid, _workspace_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_members WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.accept_rw_invite(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invite rw_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM rw_invites WHERE token = p_token AND accepted = false AND expires_at > now();
  IF v_invite IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite'); END IF;
  INSERT INTO rw_members (workspace_id, user_id, role) VALUES (v_invite.workspace_id, auth.uid(), v_invite.role) ON CONFLICT (workspace_id, user_id) DO NOTHING;
  UPDATE rw_invites SET accepted = true WHERE id = v_invite.id;
  RETURN jsonb_build_object('success', true, 'workspace_id', v_invite.workspace_id);
END;
$$;

-- RLS: rw_workspaces
CREATE POLICY "Members can view workspaces" ON public.rw_workspaces FOR SELECT USING (is_rw_member(auth.uid(), id));
CREATE POLICY "Auth users can create workspaces" ON public.rw_workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update workspace" ON public.rw_workspaces FOR UPDATE USING (is_rw_role(auth.uid(), id, 'owner'));
CREATE POLICY "Owner can delete workspace" ON public.rw_workspaces FOR DELETE USING (is_rw_role(auth.uid(), id, 'owner'));

-- RLS: rw_members
CREATE POLICY "Members can view members" ON public.rw_members FOR SELECT USING (is_rw_member(auth.uid(), workspace_id));
CREATE POLICY "Owner can add members" ON public.rw_members FOR INSERT WITH CHECK (is_rw_role(auth.uid(), workspace_id, 'owner') OR auth.uid() = user_id);
CREATE POLICY "Owner can remove members" ON public.rw_members FOR DELETE USING (is_rw_role(auth.uid(), workspace_id, 'owner') OR auth.uid() = user_id);
CREATE POLICY "Owner can update members" ON public.rw_members FOR UPDATE USING (is_rw_role(auth.uid(), workspace_id, 'owner'));

-- RLS: rw_pages
CREATE POLICY "Members can view pages" ON public.rw_pages FOR SELECT USING (
  is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user')
  OR (is_rw_role(auth.uid(), workspace_id, 'press') AND is_public = true)
);
CREATE POLICY "Owner and user can create pages" ON public.rw_pages FOR INSERT WITH CHECK (
  auth.uid() = created_by AND (is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user'))
);
CREATE POLICY "Owner and user can update pages" ON public.rw_pages FOR UPDATE USING (
  is_rw_role(auth.uid(), workspace_id, 'owner') OR is_rw_role(auth.uid(), workspace_id, 'user')
);
CREATE POLICY "Owner can delete pages" ON public.rw_pages FOR DELETE USING (
  is_rw_role(auth.uid(), workspace_id, 'owner') OR (is_rw_role(auth.uid(), workspace_id, 'user') AND auth.uid() = created_by)
);

-- RLS: rw_invites
CREATE POLICY "Owner can create invites" ON public.rw_invites FOR INSERT WITH CHECK (auth.uid() = invited_by AND is_rw_role(auth.uid(), workspace_id, 'owner'));
CREATE POLICY "Owner can view invites" ON public.rw_invites FOR SELECT USING (is_rw_role(auth.uid(), workspace_id, 'owner'));
CREATE POLICY "Owner can delete invites" ON public.rw_invites FOR DELETE USING (is_rw_role(auth.uid(), workspace_id, 'owner'));
