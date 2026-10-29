
-- Forum flairs table (both post and user flairs)
CREATE TABLE public.forum_flairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.forum_communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ffffff',
  bg_color TEXT NOT NULL DEFAULT '#3b82f6',
  flair_type TEXT NOT NULL DEFAULT 'post',
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User flair assignments
CREATE TABLE public.forum_user_flair_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flair_id UUID NOT NULL REFERENCES public.forum_flairs(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.forum_communities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

-- Add flair_id to forum_posts
ALTER TABLE public.forum_posts ADD COLUMN flair_id UUID REFERENCES public.forum_flairs(id) ON DELETE SET NULL;

-- RLS for forum_flairs
ALTER TABLE public.forum_flairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flairs viewable by everyone" ON public.forum_flairs
  FOR SELECT USING (true);

CREATE POLICY "Community creator can insert flairs" ON public.forum_flairs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM forum_communities WHERE id = community_id AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Community creator can update flairs" ON public.forum_flairs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM forum_communities WHERE id = community_id AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Community creator can delete flairs" ON public.forum_flairs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM forum_communities WHERE id = community_id AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- RLS for user flair assignments
ALTER TABLE public.forum_user_flair_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User flair assignments viewable by everyone" ON public.forum_user_flair_assignments
  FOR SELECT USING (true);

CREATE POLICY "Users can set own flair" ON public.forum_user_flair_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flair" ON public.forum_user_flair_assignments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own flair" ON public.forum_user_flair_assignments
  FOR DELETE USING (auth.uid() = user_id);
