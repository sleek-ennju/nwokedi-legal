-- ════════════════════════════════════════════════════════════════════
-- Nwokedi Legal — initial schema
-- Security model:
--   • RLS is ON for every table and there are NO anon/public policies.
--     The website writes only from the server with the service-role key.
--   • Admins (rows in public.admins) can READ through the dashboard (Phase 3).
--   • Book files live in a PRIVATE storage bucket; buyers only ever receive
--     short-lived signed URLs after a download token is validated.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── admins ─────────────────────────────────────────────────────────
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "admins can see the admin list"
  on public.admins for select to authenticated
  using (public.is_admin());

-- ── books ──────────────────────────────────────────────────────────
-- Phase 3 moves the catalogue here from src/content/books.ts.
create table public.books (
  slug          text primary key check (slug ~ '^[a-z0-9-]+$'),
  title         text not null,
  subtitle      text,
  price_ngn     integer not null check (price_ngn >= 0),        -- whole naira
  price_usd     integer check (price_usd >= 0),                 -- whole dollars, optional
  file_path     text,                                           -- object path in the private "books" bucket
  sample_pages  integer not null default 12 check (sample_pages >= 0),
  status        text not null default 'draft' check (status in ('draft', 'coming-soon', 'published')),
  content       jsonb not null default '{}'::jsonb,             -- synopsis, contents, cover theme, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.books enable row level security;
create policy "admins read books" on public.books for select to authenticated using (public.is_admin());

-- ── orders ─────────────────────────────────────────────────────────
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,                           -- our ref, also sent to Paystack
  book_slug     text not null,
  name          text not null,
  email         text not null,
  amount_minor  integer not null check (amount_minor > 0),      -- kobo / cents
  currency      text not null check (currency in ('NGN', 'USD')),
  status        text not null default 'pending'
                  check (status in ('pending', 'paid', 'failed', 'abandoned', 'refunded')),
  provider      text not null default 'paystack',
  paid_at       timestamptz,
  delivered_at  timestamptz,                                    -- when the download email was sent
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index orders_email_idx   on public.orders (lower(email));
create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_book_idx    on public.orders (book_slug, created_at desc);
alter table public.orders enable row level security;
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());

-- ── download tokens ────────────────────────────────────────────────
-- Only a SHA-256 hash of the token is stored; the raw token exists only in the buyer's email.
create table public.download_tokens (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  max_uses    integer not null default 5 check (max_uses > 0),
  uses        integer not null default 0 check (uses >= 0),
  created_at  timestamptz not null default now()
);
create index download_tokens_order_idx on public.download_tokens (order_id);
alter table public.download_tokens enable row level security;
create policy "admins read tokens" on public.download_tokens for select to authenticated using (public.is_admin());

-- Atomically validate + consume one use of a token. Returns the book to serve,
-- or nothing if the token is unknown, expired, used up, or the order isn't paid.
create or replace function public.consume_download(p_token_hash text)
returns table (order_id uuid, book_slug text, file_path text, uses_left integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.download_tokens t
     set uses = t.uses + 1
    from public.orders o
    left join public.books b on b.slug = o.book_slug
   where t.token_hash = p_token_hash
     and t.order_id = o.id
     and o.status = 'paid'
     and t.expires_at > now()
     and t.uses < t.max_uses
  returning o.id, o.book_slug, b.file_path, t.max_uses - t.uses;
end;
$$;
revoke all on function public.consume_download(text) from public, anon, authenticated;

-- ── store analytics events (cookieless; no IPs) ─────────────────────
create table public.events (
  id          bigint generated always as identity primary key,
  event       text not null check (event in (
                'store_view', 'book_view', 'sample_open', 'sample_page', 'sample_complete',
                'checkout_start', 'checkout_submit', 'payment_success')),
  sid         text not null,
  slug        text,
  n           integer,
  currency    text,
  referrer    text,
  utm         text,
  device      text check (device in ('mobile', 'desktop')),
  country     text,
  created_at  timestamptz not null default now()
);
create index events_time_idx  on public.events (created_at desc);
create index events_funnel_idx on public.events (event, slug, created_at desc);
alter table public.events enable row level security;
create policy "admins read events" on public.events for select to authenticated using (public.is_admin());

-- ── consultation enquiries ─────────────────────────────────────────
create table public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  practice    text not null,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'replied', 'archived')),
  created_at  timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries (status, created_at desc);
alter table public.enquiries enable row level security;
create policy "admins read enquiries" on public.enquiries for select to authenticated using (public.is_admin());
create policy "admins update enquiries" on public.enquiries for update to authenticated using (public.is_admin());

-- ── keep updated_at honest ─────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

-- ── explicit API grants ────────────────────────────────────────────
-- The project is created with "Grant API access to new tables automatically"
-- OFF, so nothing is exposed by default. Grant exactly what's needed:
--   • service_role (the website's server) can read/write everything;
--   • authenticated users can SELECT (and update enquiries) — RLS above limits
--     that to admins only;
--   • anon gets nothing.
grant usage on schema public to service_role, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.consume_download(text) to service_role;
grant select on public.admins, public.books, public.orders, public.download_tokens, public.events, public.enquiries to authenticated;
grant update on public.enquiries to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ── storage: private bucket for full book files ─────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', false, 104857600, array['application/pdf', 'application/epub+zip'])
on conflict (id) do nothing;
-- No storage policies are created for "books": with RLS on storage.objects,
-- only the service role (server) can read or write these files.
