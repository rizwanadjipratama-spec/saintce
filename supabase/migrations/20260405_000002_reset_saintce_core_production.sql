begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

drop publication if exists saintce_realtime_tmp;

drop table if exists public.audit_logs cascade;
drop table if exists public.admin_users cascade;
drop table if exists public.about_section cascade;
drop table if exists public.clients cascade;
drop table if exists public.site_content_sections cascade;

drop type if exists public.client_status cascade;
drop type if exists public.app_role cascade;

create type public.client_status as enum ('live', 'beta', 'private', 'archived');
create type public.app_role as enum ('owner', 'admin', 'editor', 'viewer');

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  insert into public.audit_logs (
    actor_user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  values (
    v_actor,
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email citext not null unique,
  full_name text,
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index admin_users_role_idx on public.admin_users (role);
create index admin_users_active_idx on public.admin_users (is_active);

create or replace function public.is_saintce_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and au.role in ('owner', 'admin', 'editor')
  );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text generated always as (
    regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g')
  ) stored,
  category text,
  description text,
  link text not null check (btrim(link) <> ''),
  status public.client_status not null default 'live',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint clients_slug_unique unique (slug)
);

create index clients_status_created_at_idx on public.clients (status, created_at desc);
create index clients_sort_order_idx on public.clients (sort_order asc, created_at desc);
create index clients_featured_idx on public.clients (is_featured);
create index clients_meta_gin_idx on public.clients using gin (meta);

create table public.about_section (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  title text not null default '',
  subtitle text not null default '',
  paragraph1 text not null default '',
  paragraph2 text not null default '',
  paragraph3 text not null default '',
  meta jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint about_section_singleton_key_unique unique (singleton_key)
);

create table public.site_content_sections (
  section_key text primary key,
  heading text,
  subheading text,
  body text,
  primary_label text,
  secondary_label text,
  items jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_logs_table_name_idx on public.audit_logs (table_name, created_at desc);
create index audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_record_id_idx on public.audit_logs (record_id);

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists about_section_set_updated_at on public.about_section;
create trigger about_section_set_updated_at
before update on public.about_section
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists site_content_sections_set_updated_at on public.site_content_sections;
create trigger site_content_sections_set_updated_at
before update on public.site_content_sections
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists clients_audit_trigger on public.clients;
create trigger clients_audit_trigger
after insert or update or delete on public.clients
for each row
execute function public.write_audit_log();

drop trigger if exists about_section_audit_trigger on public.about_section;
create trigger about_section_audit_trigger
after update on public.about_section
for each row
execute function public.write_audit_log();

alter table public.admin_users enable row level security;
alter table public.clients enable row level security;
alter table public.about_section enable row level security;
alter table public.site_content_sections enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_saintce_admin());

drop policy if exists "admin_users_admin_manage" on public.admin_users;
create policy "admin_users_admin_manage"
on public.admin_users
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

drop policy if exists "clients_public_read" on public.clients;
create policy "clients_public_read"
on public.clients
for select
to anon, authenticated
using (status <> 'archived');

drop policy if exists "clients_admin_manage" on public.clients;
create policy "clients_admin_manage"
on public.clients
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

drop policy if exists "about_public_read" on public.about_section;
create policy "about_public_read"
on public.about_section
for select
to anon, authenticated
using (true);

drop policy if exists "about_admin_manage" on public.about_section;
create policy "about_admin_manage"
on public.about_section
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

drop policy if exists "site_content_sections_public_read" on public.site_content_sections;
create policy "site_content_sections_public_read"
on public.site_content_sections
for select
to anon, authenticated
using (true);

drop policy if exists "site_content_sections_admin_manage" on public.site_content_sections;
create policy "site_content_sections_admin_manage"
on public.site_content_sections
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
on public.audit_logs
for select
to authenticated
using (public.is_saintce_admin());

insert into public.about_section (
  singleton_key,
  title,
  subtitle,
  paragraph1,
  paragraph2,
  paragraph3
)
values (
  true,
  'Design the system before scaling the company.',
  'Saintce replaces scattered surfaces with one controllable operating layer.',
  'This build now reads from the live About CMS when content exists, so the public story can be managed directly from Saintce Control instead of being hardcoded across the frontend.',
  'The refactor removes duplicated admin flows and centralizes the data contract, which gives you a cleaner path to expand toward a fuller ERP-style back office.',
  'Every visible surface is moving toward one rule: fewer abstractions, fewer duplicate queries, and tighter control over performance and behavior.'
);

insert into public.site_content_sections (section_key, heading, subheading, body, primary_label, secondary_label, items, meta)
values
  (
    'hero',
    'Skeuomorphic control surface for modern operations',
    'Build the system. Control the surface.',
    'Saintce turns marketing, client delivery, and internal admin operations into one polished control layer with premium performance and disciplined architecture.',
    'Launch a Build',
    'Open Saintce Control',
    '[{"label":"Admin Coverage","value":"Clients, CMS, Ops"},{"label":"Performance","value":"GPU-safe motion, cleaned timers, controlled subscriptions."},{"label":"Architecture","value":"Centralized data access with less duplication and cleaner state flow."}]'::jsonb,
    '{"panelEyebrow":"Command Surface","panelTitle":"Clients, CMS, Ops","footerLeft":"Saintce Control","footerRight":"Edition 2026"}'::jsonb
  ),
  (
    'process',
    'Process',
    'Built like a control system, not a landing page.',
    null,
    null,
    null,
    '[{"number":"01","title":"Map the system","description":"We collapse goals, permissions, content flows, and entities into one operating model before visuals or code fan out."},{"number":"02","title":"Shape the surface","description":"Navigation, panels, forms, and actions are designed as tactile control hardware so the interface feels deliberate, not generic."},{"number":"03","title":"Engineer the runtime","description":"We centralize data access, remove duplicate state paths, and keep motion cheap enough for Chrome inspection and real use."},{"number":"04","title":"Expand the console","description":"Once the core is reliable, new modules can grow into CRM, ERP, and internal operations without rewriting the shell."}]'::jsonb,
    '{}'::jsonb
  ),
  (
    'cta',
    'Contact',
    'Build the public face and the internal machine together.',
    'Saintce is now structured so the website and admin control layer can evolve as one product instead of two disconnected builds.',
    'Start a Saintce Build',
    null,
    '[]'::jsonb,
    '{}'::jsonb
  ),
  (
    'footer',
    null,
    null,
    'Premium control surfaces for operations, delivery, and modern enterprise websites.',
    'Copyright 2026 Saintce Systems. All rights reserved.',
    null,
    '[]'::jsonb,
    '{}'::jsonb
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'clients'
  ) then
    execute 'alter publication supabase_realtime add table public.clients';
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'about_section'
  ) then
    execute 'alter publication supabase_realtime add table public.about_section';
  end if;
end
$$;

commit;
