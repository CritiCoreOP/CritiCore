
-- ============================================================
-- Wiki Pages
-- ============================================================
CREATE TABLE public.wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  content text DEFAULT '',
  page_type text NOT NULL DEFAULT 'article',
  infobox jsonb DEFAULT '{}',
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  updated_by uuid,
  published boolean NOT NULL DEFAULT false,
  protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Published wiki pages viewable by everyone"
  ON public.wiki_pages FOR SELECT
  USING (published = true);

-- Authors can see their own unpublished pages
CREATE POLICY "Authors can view own wiki pages"
  ON public.wiki_pages FOR SELECT
  USING (auth.uid() = created_by);

-- Authenticated users can create pages
CREATE POLICY "Authenticated users can create wiki pages"
  ON public.wiki_pages FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Authenticated users can update non-protected pages
CREATE POLICY "Users can update non-protected wiki pages"
  ON public.wiki_pages FOR UPDATE
  USING (protected = false AND auth.uid() IS NOT NULL);

-- Admins/press can update protected pages
CREATE POLICY "Admins can update protected wiki pages"
  ON public.wiki_pages FOR UPDATE
  USING (protected = true AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'press')));

-- Admins can delete wiki pages
CREATE POLICY "Admins can delete wiki pages"
  ON public.wiki_pages FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_wiki_pages_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Wiki Revisions
-- ============================================================
CREATE TABLE public.wiki_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  title text,
  content text,
  infobox jsonb,
  edit_summary text DEFAULT '',
  edited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_revisions ENABLE ROW LEVEL SECURITY;

-- Everyone can read revisions
CREATE POLICY "Wiki revisions viewable by everyone"
  ON public.wiki_revisions FOR SELECT
  USING (true);

-- Authenticated users can insert revisions
CREATE POLICY "Authenticated users can create wiki revisions"
  ON public.wiki_revisions FOR INSERT
  WITH CHECK (auth.uid() = edited_by);

-- ============================================================
-- Wiki Discussions
-- ============================================================
CREATE TABLE public.wiki_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.wiki_discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_discussions ENABLE ROW LEVEL SECURITY;

-- Everyone can read discussions
CREATE POLICY "Wiki discussions viewable by everyone"
  ON public.wiki_discussions FOR SELECT
  USING (true);

-- Authenticated users can create discussions
CREATE POLICY "Authenticated users can create wiki discussions"
  ON public.wiki_discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own discussions
CREATE POLICY "Users can update own wiki discussions"
  ON public.wiki_discussions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own discussions
CREATE POLICY "Users can delete own wiki discussions"
  ON public.wiki_discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any discussion
CREATE POLICY "Admins can delete any wiki discussion"
  ON public.wiki_discussions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_wiki_discussions_updated_at
  BEFORE UPDATE ON public.wiki_discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
