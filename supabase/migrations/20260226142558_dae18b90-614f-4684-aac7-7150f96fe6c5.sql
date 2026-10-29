
-- Create article_collaborators table
CREATE TABLE public.article_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  invited_by uuid NOT NULL,
  invite_token text UNIQUE,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

ALTER TABLE public.article_collaborators ENABLE ROW LEVEL SECURITY;

-- Author and collaborators can view collaborators for their articles
CREATE POLICY "Article owner can view collaborators"
  ON public.article_collaborators FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = invited_by
    OR EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
  );

-- Article owner can invite collaborators
CREATE POLICY "Article owner can invite collaborators"
  ON public.article_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
  );

-- Article owner can remove collaborators
CREATE POLICY "Article owner can remove collaborators"
  ON public.article_collaborators FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
    OR auth.uid() = user_id
  );

-- Article owner can update collaborators
CREATE POLICY "Article owner can update collaborators"
  ON public.article_collaborators FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
    OR auth.uid() = user_id
  );

-- Admins full access
CREATE POLICY "Admins can manage all collaborators"
  ON public.article_collaborators FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view accepted collaborators (for displaying co-authors)
CREATE POLICY "Public can view accepted collaborators"
  ON public.article_collaborators FOR SELECT
  USING (accepted = true);

-- Allow collaborators to also update articles they're invited to
CREATE POLICY "Collaborators can update articles"
  ON public.articles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.article_collaborators
      WHERE article_id = id AND user_id = auth.uid() AND accepted = true
    )
  );

-- Allow collaborators to view draft articles they collaborate on
CREATE POLICY "Collaborators can view collab articles"
  ON public.articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.article_collaborators
      WHERE article_id = id AND user_id = auth.uid() AND accepted = true
    )
  );

-- Function to accept invite by token
CREATE OR REPLACE FUNCTION public.accept_article_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite article_collaborators%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM article_collaborators WHERE invite_token = p_token AND accepted = false;
  
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- If user_id is not set yet, set it to current user
  IF v_invite.user_id IS NULL OR v_invite.user_id = v_invite.invited_by THEN
    UPDATE article_collaborators 
    SET user_id = auth.uid(), accepted = true, invite_token = NULL, updated_at = now()
    WHERE id = v_invite.id;
  ELSE
    -- Check if current user matches invited user
    IF v_invite.user_id != auth.uid() THEN
      RETURN jsonb_build_object('success', false, 'error', 'This invite is for another user');
    END IF;
    UPDATE article_collaborators 
    SET accepted = true, invite_token = NULL, updated_at = now()
    WHERE id = v_invite.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'article_id', v_invite.article_id);
END;
$$;
