
CREATE TABLE public.forum_community_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.forum_communities(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_community_widgets ENABLE ROW LEVEL SECURITY;

-- Everyone can view widgets
CREATE POLICY "Widgets viewable by everyone" ON public.forum_community_widgets
  FOR SELECT USING (true);

-- Community creator can manage widgets
CREATE POLICY "Creator can insert widgets" ON public.forum_community_widgets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.forum_communities WHERE id = community_id AND created_by = auth.uid())
  );

CREATE POLICY "Creator can update widgets" ON public.forum_community_widgets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.forum_communities WHERE id = community_id AND created_by = auth.uid())
  );

CREATE POLICY "Creator can delete widgets" ON public.forum_community_widgets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.forum_communities WHERE id = community_id AND created_by = auth.uid())
  );

-- Admins can manage all widgets
CREATE POLICY "Admins can manage widgets" ON public.forum_community_widgets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
