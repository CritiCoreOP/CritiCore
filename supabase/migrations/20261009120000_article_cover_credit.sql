-- Credit for an article's cover picture ("Nintendo", "Foto: Jane Doe / Unsplash") and an optional
-- link to the source. Until now the cover had no credit at all; images in the text carry theirs in
-- the article HTML.

alter table public.articles
  add column if not exists cover_image_credit text,
  add column if not exists cover_image_credit_url text;

alter table public.articles
  drop constraint if exists articles_cover_image_credit_length,
  add constraint articles_cover_image_credit_length
    check (cover_image_credit is null or char_length(cover_image_credit) <= 160),
  drop constraint if exists articles_cover_image_credit_url_http,
  add constraint articles_cover_image_credit_url_http
    check (cover_image_credit_url is null or (cover_image_credit_url ~* '^https?://' and char_length(cover_image_credit_url) <= 500));
