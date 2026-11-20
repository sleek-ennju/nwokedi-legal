-- ════════════════════════════════════════════════════════════════════
-- Articles (insights): written in the admin, read on /articles.
-- Same model: RLS on, no anon access; the website's server reads/writes.
-- "Scheduled" = status 'published' with publish_at in the future.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.articles (
  slug         text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null,
  excerpt      text not null default '',
  body         text not null default '',          -- Markdown (a safe subset, rendered by the site)
  practice     text not null default 'general',   -- a practice id from the site, or 'general'
  cover_url    text,                              -- public image in the book-media bucket
  cover_alt    text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  publish_at   timestamptz,
  featured     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists articles_public_idx on public.articles (status, publish_at desc);

alter table public.articles enable row level security;
drop policy if exists "admins read articles" on public.articles;
create policy "admins read articles" on public.articles for select to authenticated using (public.is_admin());

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.articles to service_role;
grant select on public.articles to authenticated;
