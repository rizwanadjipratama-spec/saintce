-- ============================================================
-- Migration: Automation Logs + Soft Delete + Project Notes
-- Date: 2026-04-06
-- ============================================================

begin;

-- -------------------------------------------------------
-- automation_logs: track every billing automation run
-- -------------------------------------------------------
create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null,
  invoices_generated integer not null default 0,
  invoices_overdue integer not null default 0,
  subscriptions_suspended integer not null default 0,
  notifications_sent integer not null default 0,
  notifications_skipped integer not null default 0,
  duration_ms integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists automation_logs_run_at_idx on public.automation_logs (run_at desc);
create index if not exists automation_logs_created_at_idx on public.automation_logs (created_at desc);

alter table public.automation_logs enable row level security;

drop policy if exists "automation_logs_admin_manage" on public.automation_logs;
create policy "automation_logs_admin_manage"
on public.automation_logs
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

-- -------------------------------------------------------
-- Soft delete: add deleted_at to clients, projects, services
-- RLS policies updated to exclude soft-deleted rows
-- -------------------------------------------------------

alter table public.clients
  add column if not exists deleted_at timestamptz;

alter table public.projects
  add column if not exists deleted_at timestamptz;

alter table public.services
  add column if not exists deleted_at timestamptz;

create index if not exists clients_deleted_at_idx on public.clients (deleted_at) where deleted_at is null;
create index if not exists projects_deleted_at_idx on public.projects (deleted_at) where deleted_at is null;
create index if not exists services_deleted_at_idx on public.services (deleted_at) where deleted_at is null;

-- Update existing admin policies to exclude soft-deleted rows

drop policy if exists "clients_admin_manage" on public.clients;
create policy "clients_admin_manage"
on public.clients
for all
to authenticated
using (public.is_saintce_admin() and deleted_at is null)
with check (public.is_saintce_admin());

drop policy if exists "clients_public_read" on public.clients;
create policy "clients_public_read"
on public.clients
for select
to anon, authenticated
using (status <> 'archived' and deleted_at is null);

drop policy if exists "clients_portal_self_read" on public.clients;
create policy "clients_portal_self_read"
on public.clients
for select
to authenticated
using (
  lower(email::text) = lower((select email from auth.users where id = auth.uid()))
  and deleted_at is null
);

drop policy if exists "projects_admin_manage" on public.projects;
create policy "projects_admin_manage"
on public.projects
for all
to authenticated
using (public.is_saintce_admin() and deleted_at is null)
with check (public.is_saintce_admin());

drop policy if exists "projects_portal_read" on public.projects;
create policy "projects_portal_read"
on public.projects
for select
to authenticated
using (
  client_id = public.get_portal_client_id()
  and deleted_at is null
);

drop policy if exists "services_admin_manage" on public.services;
create policy "services_admin_manage"
on public.services
for all
to authenticated
using (public.is_saintce_admin() and deleted_at is null)
with check (public.is_saintce_admin());

drop policy if exists "services_portal_read" on public.services;
create policy "services_portal_read"
on public.services
for select
to authenticated
using (
  project_id in (
    select id from public.projects
    where client_id = public.get_portal_client_id()
      and deleted_at is null
  )
  and deleted_at is null
);

-- -------------------------------------------------------
-- Project notes: add notes column to projects
-- (clients already has notes from migration 5)
-- -------------------------------------------------------
alter table public.projects
  add column if not exists notes text;

-- -------------------------------------------------------
-- Client notes index (for full-text search later)
-- -------------------------------------------------------
create index if not exists clients_notes_idx on public.clients (id) where notes is not null;

commit;
