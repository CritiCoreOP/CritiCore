-- When an article went live. Until now there was only created_at (when the draft was started), so
-- the Google News sitemap and the article's structured data (datePublished) used the draft date.

alter table public.articles add column if not exists published_at timestamptz;

-- Set on the first publication and kept afterwards, also when the article is taken offline and
-- published again: the original date stays the date of the story
create or replace function public.set_article_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists articles_set_published_at on public.articles;
create trigger articles_set_published_at
  before insert or update of published on public.articles
  for each row execute function public.set_article_published_at();

-- Articles already online: the real moment is unknown, the creation date is the closest there is.
-- Not an edit, so updated_at stays as it is.
alter table public.articles disable trigger update_articles_updated_at;
update public.articles set published_at = created_at where published and published_at is null;
alter table public.articles enable trigger update_articles_updated_at;
