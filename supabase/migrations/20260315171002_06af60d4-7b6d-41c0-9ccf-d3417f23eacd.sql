
-- Create forum_communities table
CREATE TABLE public.forum_communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  banner_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  member_count INTEGER NOT NULL DEFAULT 1,
  post_count INTEGER NOT NULL DEFAULT 0,
  is_official BOOLEAN NOT NULL DEFAULT false
);

-- Create forum_community_members table
CREATE TABLE public.forum_community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.forum_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Add community_id to forum_posts (nullable for migration, existing posts have no community)
ALTER TABLE public.forum_posts ADD COLUMN community_id UUID REFERENCES public.forum_communities(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.forum_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_community_members ENABLE ROW LEVEL SECURITY;

-- RLS for forum_communities
CREATE POLICY "Communities viewable by everyone" ON public.forum_communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON public.forum_communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update community" ON public.forum_communities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Admins can update any community" ON public.forum_communities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any community" ON public.forum_communities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for forum_community_members
CREATE POLICY "Members viewable by everyone" ON public.forum_community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON public.forum_community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities" ON public.forum_community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage members" ON public.forum_community_members FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for communities
CREATE TRIGGER update_forum_communities_updated_at BEFORE UPDATE ON public.forum_communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
