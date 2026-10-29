
-- ============================================================
-- Categories (hierarchical, admin-managed)
-- ============================================================
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Category version history for rename tracking
CREATE TABLE public.category_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  previous_name text NOT NULL,
  new_name text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Category versions viewable by everyone" ON public.category_versions FOR SELECT USING (true);
CREATE POLICY "Admins can insert category versions" ON public.category_versions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Tags (community-suggested, admin-approved)
-- ============================================================
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_by uuid,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved tags viewable by everyone" ON public.tags FOR SELECT USING (status = 'approved' OR has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);
CREATE POLICY "Authenticated users can suggest tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = created_by AND status = 'pending');
CREATE POLICY "Admins can update tags" ON public.tags FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_tags_status ON public.tags(status);

-- ============================================================
-- Media-Category assignments (many-to-many)
-- ============================================================
CREATE TABLE public.media_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL,
  media_type text NOT NULL, -- movie, series, game
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(media_id, media_type, category_id)
);

ALTER TABLE public.media_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media categories viewable by everyone" ON public.media_categories FOR SELECT USING (true);
CREATE POLICY "Admins can assign categories" ON public.media_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can remove category assignments" ON public.media_categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_media_categories_media ON public.media_categories(media_id, media_type);
CREATE INDEX idx_media_categories_category ON public.media_categories(category_id);

-- ============================================================
-- Media-Tag assignments (many-to-many)
-- ============================================================
CREATE TABLE public.media_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL,
  media_type text NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(media_id, media_type, tag_id)
);

ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media tags viewable by everyone" ON public.media_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add tags" ON public.media_tags FOR INSERT WITH CHECK (auth.uid() = assigned_by);
CREATE POLICY "Admins can remove tag assignments" ON public.media_tags FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_media_tags_media ON public.media_tags(media_id, media_type);
CREATE INDEX idx_media_tags_tag ON public.media_tags(tag_id);

-- ============================================================
-- Release information (per region)
-- ============================================================
CREATE TABLE public.media_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL,
  media_type text NOT NULL,
  region text NOT NULL DEFAULT 'global',
  release_date date,
  status text NOT NULL DEFAULT 'released', -- released, upcoming, delayed, cancelled
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(media_id, media_type, region)
);

ALTER TABLE public.media_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Releases viewable by everyone" ON public.media_releases FOR SELECT USING (true);
CREATE POLICY "Admins can insert releases" ON public.media_releases FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update releases" ON public.media_releases FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete releases" ON public.media_releases FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_media_releases_media ON public.media_releases(media_id, media_type);
CREATE INDEX idx_media_releases_date ON public.media_releases(release_date);
CREATE INDEX idx_media_releases_status ON public.media_releases(status);

-- ============================================================
-- Extended metadata (key-value, multiple per media)
-- ============================================================
CREATE TABLE public.media_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL,
  media_type text NOT NULL,
  meta_key text NOT NULL, -- genre, studio, publisher, platform, runtime, age_rating
  meta_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(media_id, media_type, meta_key, meta_value)
);

ALTER TABLE public.media_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Metadata viewable by everyone" ON public.media_metadata FOR SELECT USING (true);
CREATE POLICY "Admins can insert metadata" ON public.media_metadata FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update metadata" ON public.media_metadata FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete metadata" ON public.media_metadata FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_media_metadata_media ON public.media_metadata(media_id, media_type);
CREATE INDEX idx_media_metadata_key ON public.media_metadata(meta_key);

-- ============================================================
-- Watchlist / Wishlist
-- ============================================================
CREATE TABLE public.user_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_id text NOT NULL,
  media_type text NOT NULL,
  list_type text NOT NULL DEFAULT 'watchlist', -- watchlist, wishlist
  priority integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id, media_type, list_type)
);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own watchlist" ON public.user_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watchlist" ON public.user_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlist" ON public.user_watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from watchlist" ON public.user_watchlist FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_watchlist_user ON public.user_watchlist(user_id);
CREATE INDEX idx_user_watchlist_media ON public.user_watchlist(media_id, media_type);

-- ============================================================
-- Release notification subscriptions
-- ============================================================
CREATE TABLE public.release_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_id text NOT NULL,
  media_type text NOT NULL,
  notify_on text[] NOT NULL DEFAULT '{release,delay,cancel}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id, media_type)
);

ALTER TABLE public.release_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.release_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create subscriptions" ON public.release_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.release_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.release_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_release_subs_user ON public.release_subscriptions(user_id);
CREATE INDEX idx_release_subs_media ON public.release_subscriptions(media_id, media_type);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_releases_updated_at BEFORE UPDATE ON public.media_releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
