
-- Badge definitions (admin-managed catalog of all possible badges)
CREATE TABLE public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  category text NOT NULL DEFAULT 'activity',
  condition_type text NOT NULL DEFAULT 'manual',
  condition_value integer DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User badges (which users have earned which badges)
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- RLS for badge_definitions (viewable by everyone, managed by admins)
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge definitions viewable by everyone"
  ON public.badge_definitions FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can manage badge definitions"
  ON public.badge_definitions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges viewable by everyone"
  ON public.user_badges FOR SELECT
  TO public USING (true);

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own badges (mark seen)"
  ON public.user_badges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed default badge definitions
INSERT INTO public.badge_definitions (slug, name, description, icon, category, condition_type, condition_value, sort_order) VALUES
  ('first-review', 'Erster Eindruck', 'Schreibe dein erstes Review', '✍️', 'activity', 'review_count', 1, 10),
  ('reviewer-10', 'Filmkritiker', '10 Reviews geschrieben', '🎬', 'activity', 'review_count', 10, 20),
  ('reviewer-50', 'Kritiker-Profi', '50 Reviews geschrieben', '⭐', 'activity', 'review_count', 50, 30),
  ('reviewer-100', 'Review-Meister', '100 Reviews geschrieben', '👑', 'activity', 'review_count', 100, 40),
  ('first-list', 'Kurator', 'Erstelle deine erste Liste', '📋', 'activity', 'list_count', 1, 50),
  ('lists-5', 'Sammler', '5 Listen erstellt', '🗂️', 'collection', 'list_count', 5, 60),
  ('watchlist-10', 'Watchlist-Starter', '10 Einträge auf der Watchlist', '👀', 'collection', 'watchlist_count', 10, 70),
  ('watchlist-50', 'Binge-Planer', '50 Einträge auf der Watchlist', '📺', 'collection', 'watchlist_count', 50, 80),
  ('watchlist-100', 'Entertainment-Archiv', '100 Einträge auf der Watchlist', '🏛️', 'collection', 'watchlist_count', 100, 90),
  ('karma-100', 'Aktiv', 'Erreiche 100 Karma im Forum', '💬', 'karma', 'karma_total', 100, 100),
  ('karma-500', 'Erfahren', 'Erreiche 500 Karma im Forum', '🔥', 'karma', 'karma_total', 500, 110),
  ('karma-1000', 'Veteran', 'Erreiche 1000 Karma im Forum', '🏅', 'karma', 'karma_total', 1000, 120),
  ('karma-5000', 'Legende', 'Erreiche 5000 Karma im Forum', '🌟', 'karma', 'karma_total', 5000, 130),
  ('beta-tester', 'Beta-Tester', 'War bei der Beta dabei', '🧪', 'special', 'manual', NULL, 200),
  ('community-helper', 'Community-Helfer', 'Hilft anderen in der Community', '🤝', 'special', 'manual', NULL, 210),
  ('first-post', 'Debüt', 'Erstelle deinen ersten Forum-Post', '📝', 'activity', 'post_count', 1, 140),
  ('posts-25', 'Stammgast', '25 Forum-Posts geschrieben', '🏠', 'activity', 'post_count', 25, 150);
