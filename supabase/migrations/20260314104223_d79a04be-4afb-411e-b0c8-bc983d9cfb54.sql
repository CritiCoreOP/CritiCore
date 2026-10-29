
-- Roadmap items table
CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_key text NOT NULL,
  desc_key text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('done', 'in-progress', 'planned')),
  quarter text,
  old_quarter text,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- Public can read visible items
CREATE POLICY "Visible roadmap items viewable by everyone"
  ON public.roadmap_items FOR SELECT
  USING (visible = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "Admins can insert roadmap items"
  ON public.roadmap_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete roadmap items"
  ON public.roadmap_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
