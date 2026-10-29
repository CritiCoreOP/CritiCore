
-- Custom Lists table
CREATE TABLE public.custom_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Custom List Items table
CREATE TABLE public.custom_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.custom_lists(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_type text NOT NULL,
  media_title text NOT NULL,
  media_poster text,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, media_id, media_type)
);

-- Indexes
CREATE INDEX idx_custom_lists_user_id ON public.custom_lists(user_id);
CREATE INDEX idx_custom_list_items_list_id ON public.custom_list_items(list_id);

-- Enable RLS
ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_list_items ENABLE ROW LEVEL SECURITY;

-- RLS for custom_lists
CREATE POLICY "Users can create own lists"
  ON public.custom_lists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON public.custom_lists FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON public.custom_lists FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public lists viewable by everyone"
  ON public.custom_lists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- RLS for custom_list_items
CREATE POLICY "List owners can insert items"
  ON public.custom_list_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_lists WHERE id = list_id AND user_id = auth.uid()
  ));

CREATE POLICY "List owners can delete items"
  ON public.custom_list_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_lists WHERE id = list_id AND user_id = auth.uid()
  ));

CREATE POLICY "List owners can update items"
  ON public.custom_list_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_lists WHERE id = list_id AND user_id = auth.uid()
  ));

CREATE POLICY "Items viewable if list is accessible"
  ON public.custom_list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.custom_lists WHERE id = list_id AND (is_public = true OR user_id = auth.uid())
  ));

-- Updated_at trigger
CREATE TRIGGER update_custom_lists_updated_at
  BEFORE UPDATE ON public.custom_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
