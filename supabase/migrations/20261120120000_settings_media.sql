-- ════════════════════════════════════════════════════════════════════
-- Phase 3c — store settings + public media for book pages
-- Same security model as the initial schema: RLS on, no anon access,
-- the website's server (service role) reads and writes.
-- ════════════════════════════════════════════════════════════════════

-- ── settings: small key → JSON values edited from the dashboard ────────
create table if not exists public.settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.settings enable row level security;

drop policy if exists "admins read settings" on public.settings;
create policy "admins read settings" on public.settings for select to authenticated using (public.is_admin());

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.settings to service_role;
grant select on public.settings to authenticated;

insert into public.settings (key, value) values
  ('downloads', '{"hours": 72, "uses": 5}'),
  ('store', '{"open": true, "closedMessage": ""}')
on conflict (key) do nothing;

-- ── book-media: PUBLIC bucket for covers and sample pages only ─────────
-- (full books stay in the private "books" bucket)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-media', 'book-media', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
