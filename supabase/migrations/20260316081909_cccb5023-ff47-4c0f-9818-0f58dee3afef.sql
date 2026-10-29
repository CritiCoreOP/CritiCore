
-- Mod Mail table for community moderation messaging
CREATE TABLE public.forum_mod_mail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.forum_communities(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  is_mod_reply BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.forum_mod_mail(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_mod_mail ENABLE ROW LEVEL SECURITY;

-- Community creator (mod) can view all mod mail for their communities
CREATE POLICY "Community creator can view mod mail"
  ON public.forum_mod_mail
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_communities
      WHERE forum_communities.id = forum_mod_mail.community_id
        AND forum_communities.created_by = auth.uid()
    )
    OR sender_id = auth.uid()
  );

-- Users can send mod mail (non-reply)
CREATE POLICY "Users can send mod mail"
  ON public.forum_mod_mail
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND is_mod_reply = false
  );

-- Community creator can reply (is_mod_reply = true)
CREATE POLICY "Creator can reply to mod mail"
  ON public.forum_mod_mail
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND is_mod_reply = true
    AND EXISTS (
      SELECT 1 FROM public.forum_communities
      WHERE forum_communities.id = forum_mod_mail.community_id
        AND forum_communities.created_by = auth.uid()
    )
  );

-- Creator can update status (open/closed)
CREATE POLICY "Creator can update mod mail status"
  ON public.forum_mod_mail
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_communities
      WHERE forum_communities.id = forum_mod_mail.community_id
        AND forum_communities.created_by = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage mod mail"
  ON public.forum_mod_mail
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
