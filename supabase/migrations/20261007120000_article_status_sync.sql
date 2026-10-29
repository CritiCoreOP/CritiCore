-- Workflow status (idea → research → writing → review → published) next to the older `published` flag.
-- The editor never set a status, so new articles stayed "idea" even when published, and the board and
-- the press dashboard showed them in the wrong column. From now on the database keeps both in line on
-- every write path (editor, board, admin pages).

create or replace function public.sync_article_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.published and new.status <> 'published' then
    new.status := 'published';
  elsif not new.published and new.status = 'published' then
    -- Taken offline: back to writing
    new.status := 'writing';
  end if;
  return new;
end;
$$;

drop trigger if exists articles_sync_status on public.articles;
create trigger articles_sync_status
  before insert or update of published, status on public.articles
  for each row execute function public.sync_article_status();

-- Correcting the status is no edit: keep updated_at (sitemap dates, "last edited")
alter table public.articles disable trigger update_articles_updated_at;

-- Existing rows: published articles still marked as ideas
update public.articles set status = 'published' where published and status <> 'published';

-- Drafts with real text (roughly 50 words or more) are being written, not ideas any more
update public.articles
set status = 'writing'
where not published
  and status = 'idea'
  and length(regexp_replace(content, '<[^>]+>', '', 'g')) >= 300;

alter table public.articles enable trigger update_articles_updated_at;

-- The editor offers "Patchnotes" as a category (with labels in every language), but the check below
-- rejected it, so saving such an article failed
alter table public.articles drop constraint if exists articles_category_check;
alter table public.articles
  add constraint articles_category_check check (category = any (array['games', 'movies', 'series', 'general', 'patchnotes']));
