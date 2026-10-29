
-- Create security definer function to check collaborator access without RLS recursion
CREATE OR REPLACE FUNCTION public.is_article_collaborator(_user_id uuid, _article_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.article_collaborators
    WHERE article_id = _article_id
      AND user_id = _user_id
      AND accepted = true
  )
$$;

-- Drop broken policies
DROP POLICY IF EXISTS "Collaborators can update articles" ON public.articles;
DROP POLICY IF EXISTS "Collaborators can view collab articles" ON public.articles;

-- Recreate with security definer function
CREATE POLICY "Collaborators can update articles"
ON public.articles FOR UPDATE
USING (public.is_article_collaborator(auth.uid(), id));

CREATE POLICY "Collaborators can view collab articles"
ON public.articles FOR SELECT
USING (public.is_article_collaborator(auth.uid(), id));
