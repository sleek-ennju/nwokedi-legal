-- ════════════════════════════════════════════════════════════════════
-- Notifications for the admin workspace (bell + email alerts)
-- Same model: RLS on, no anon access; the website's server writes.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('order_paid', 'enquiry_new', 'delivery_failed', 'order_refunded')),
  title       text not null,
  body        text,
  href        text,                       -- where the bell takes her (an /admin path)
  dedupe      text unique,                -- one notification per event (webhook retries can't repeat it)
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_time_idx on public.notifications (created_at desc);
create index if not exists notifications_unread_idx on public.notifications (created_at desc) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "admins read notifications" on public.notifications;
create policy "admins read notifications" on public.notifications for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.notifications to service_role;
grant select on public.notifications to authenticated;

-- email alert preferences (edited in Settings)
insert into public.settings (key, value) values
  ('alerts', '{"email": "", "orders": true, "enquiries": true, "problems": true}')
on conflict (key) do nothing;
