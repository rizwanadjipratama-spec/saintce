-- ============================================================
-- Migration: Client Portal RLS
-- Date: 2026-04-06
-- Purpose: Allow authenticated clients to read their own
--          billing data (projects, services, subscriptions,
--          invoices, payments) via email match to clients.email
-- ============================================================

begin;

-- -------------------------------------------------------
-- Helper: is_portal_client()
-- Returns true if the logged-in auth.email matches any
-- active client record. Used by all portal RLS policies.
-- -------------------------------------------------------
create or replace function public.is_portal_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where lower(c.email::text) = lower((select email from auth.users where id = auth.uid()))
      and c.email is not null
  );
$$;

-- -------------------------------------------------------
-- Helper: get_portal_client_id()
-- Returns the client id that matches the current user's
-- email. Used to scope reads to client's own data.
-- -------------------------------------------------------
create or replace function public.get_portal_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.clients c
  where lower(c.email::text) = lower((select email from auth.users where id = auth.uid()))
    and c.email is not null
  limit 1;
$$;

-- -------------------------------------------------------
-- RLS: clients — allow client to read their own row
-- -------------------------------------------------------
drop policy if exists "clients_portal_self_read" on public.clients;
create policy "clients_portal_self_read"
on public.clients
for select
to authenticated
using (
  lower(email::text) = lower((select email from auth.users where id = auth.uid()))
);

-- -------------------------------------------------------
-- RLS: projects — client reads their own projects
-- -------------------------------------------------------
drop policy if exists "projects_portal_read" on public.projects;
create policy "projects_portal_read"
on public.projects
for select
to authenticated
using (
  client_id = public.get_portal_client_id()
);

-- -------------------------------------------------------
-- RLS: services — client reads their own services
-- -------------------------------------------------------
drop policy if exists "services_portal_read" on public.services;
create policy "services_portal_read"
on public.services
for select
to authenticated
using (
  project_id in (
    select id from public.projects
    where client_id = public.get_portal_client_id()
  )
);

-- -------------------------------------------------------
-- RLS: subscriptions — client reads their own subscriptions
-- -------------------------------------------------------
drop policy if exists "subscriptions_portal_read" on public.subscriptions;
create policy "subscriptions_portal_read"
on public.subscriptions
for select
to authenticated
using (
  service_id in (
    select svc.id from public.services svc
    join public.projects p on p.id = svc.project_id
    where p.client_id = public.get_portal_client_id()
  )
);

-- -------------------------------------------------------
-- RLS: invoices — client reads their own invoices
-- -------------------------------------------------------
drop policy if exists "invoices_portal_read" on public.invoices;
create policy "invoices_portal_read"
on public.invoices
for select
to authenticated
using (
  subscription_id in (
    select sub.id from public.subscriptions sub
    join public.services svc on svc.id = sub.service_id
    join public.projects p on p.id = svc.project_id
    where p.client_id = public.get_portal_client_id()
  )
);

-- -------------------------------------------------------
-- RLS: payments — client reads their own payments
-- -------------------------------------------------------
drop policy if exists "payments_portal_read" on public.payments;
create policy "payments_portal_read"
on public.payments
for select
to authenticated
using (
  invoice_id in (
    select inv.id from public.invoices inv
    join public.subscriptions sub on sub.id = inv.subscription_id
    join public.services svc on svc.id = sub.service_id
    join public.projects p on p.id = svc.project_id
    where p.client_id = public.get_portal_client_id()
  )
);

commit;
