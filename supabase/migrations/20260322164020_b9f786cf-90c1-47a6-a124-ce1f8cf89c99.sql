
-- Seed hierarchical categories for Explore page
-- Parent categories first
INSERT INTO public.categories (name, slug, description, sort_order)
VALUES
  ('Action',       'action',        'Action-Medien',          1),
  ('Romantik',     'romantik',      'Romantische Medien',     2),
  ('Sci-Fi',       'sci-fi',        'Science-Fiction Medien',  3),
  ('Horror',       'horror',        'Horror-Medien',           4),
  ('Slice of Life','slice-of-life', 'Slice of Life Medien',    5),
  ('Comedy',       'comedy',        'Komödien',                6),
  ('Drama',        'drama',         'Drama-Medien',            7),
  ('Fantasy',      'fantasy',       'Fantasy-Medien',          8),
  ('Thriller',     'thriller',      'Thriller-Medien',         9),
  ('Animation',    'animation',     'Animierte Medien',       10),
  ('Dokumentation','dokumentation', 'Dokumentationen',        11),
  ('Krimi',        'krimi',         'Kriminalfilme & Serien', 12),
  ('Abenteuer',    'abenteuer',     'Abenteuer-Medien',       13),
  ('Musik',        'musik',         'Musik-Medien',           14),
  ('Mystery',      'mystery',       'Mystery-Medien',         15),
  ('Krieg',        'krieg',         'Kriegsmedien',           16),
  ('Familie',      'familie',       'Familienmedien',         17),
  ('Historie',     'historie',      'Historische Medien',     18),
  ('Western',      'western',       'Western-Medien',         19)
ON CONFLICT (slug) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Sub-categories for Action
INSERT INTO public.categories (name, slug, description, sort_order, parent_id)
VALUES
  ('Martial Arts', 'martial-arts', 'Kampfkunst-Medien',  1, (SELECT id FROM public.categories WHERE slug = 'action')),
  ('Military',     'military',     'Militär-Medien',      2, (SELECT id FROM public.categories WHERE slug = 'action')),
  ('Superhero',    'superhero',    'Superhelden-Medien',  3, (SELECT id FROM public.categories WHERE slug = 'action'))
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;

-- Sub-categories for Romantik
INSERT INTO public.categories (name, slug, description, sort_order, parent_id)
VALUES
  ('Yaoi',  'yaoi',  'Boys Love',   1, (SELECT id FROM public.categories WHERE slug = 'romantik')),
  ('Yuri',  'yuri',  'Girls Love',  2, (SELECT id FROM public.categories WHERE slug = 'romantik'))
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;

-- Sub-categories for Sci-Fi
INSERT INTO public.categories (name, slug, description, sort_order, parent_id)
VALUES
  ('Cyberpunk',    'cyberpunk',    'Cyberpunk-Medien',    1, (SELECT id FROM public.categories WHERE slug = 'sci-fi')),
  ('Space Opera',  'space-opera',  'Weltraum-Epen',       2, (SELECT id FROM public.categories WHERE slug = 'sci-fi')),
  ('Dystopie',     'dystopie',     'Dystopische Medien',  3, (SELECT id FROM public.categories WHERE slug = 'sci-fi'))
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;

-- Sub-categories for Horror
INSERT INTO public.categories (name, slug, description, sort_order, parent_id)
VALUES
  ('Slasher',      'slasher',      'Slasher-Medien',       1, (SELECT id FROM public.categories WHERE slug = 'horror')),
  ('Psychological','psychological','Psycho-Horror',         2, (SELECT id FROM public.categories WHERE slug = 'horror')),
  ('Supernatural', 'supernatural', 'Übernatürlicher Horror', 3, (SELECT id FROM public.categories WHERE slug = 'horror'))
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;
