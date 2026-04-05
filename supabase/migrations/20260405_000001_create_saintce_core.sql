begin;

create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  category text,
  description text,
  link text not null check (btrim(link) <> ''),
  status text not null default 'live' check (status in ('live', 'beta', 'private', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_created_at_desc_idx
  on public.clients (created_at desc);

create index if not exists clients_status_idx
  on public.clients (status);

create index if not exists clients_status_created_at_idx
  on public.clients (status, created_at desc);

create table if not exists public.about_section (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  title text not null default '',
  subtitle text not null default '',
  paragraph1 text not null default '',
  paragraph2 text not null default '',
  paragraph3 text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint about_section_singleton_key_unique unique (singleton_key)
);

create index if not exists about_section_created_at_idx
  on public.about_section (created_at asc);

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

alter table public.clients enable row level security;
alter table public.about_section enable row level security;

drop policy if exists "public_read_non_archived_clients" on public.clients;
create policy "public_read_non_archived_clients"
on public.clients
for select
to anon, authenticated
using (status <> 'archived');

drop policy if exists "admin_manage_clients" on public.clients;
create policy "admin_manage_clients"
on public.clients
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'rizwanadjipratama@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rizwanadjipratama@gmail.com');

drop policy if exists "public_read_about_section" on public.about_section;
create policy "public_read_about_section"
on public.about_section
for select
to anon, authenticated
using (true);

drop policy if exists "admin_manage_about_section" on public.about_section;
create policy "admin_manage_about_section"
on public.about_section
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'rizwanadjipratama@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rizwanadjipratama@gmail.com');

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
end
$$;

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
      and c.relname = 'about_section'
  ) then
    execute 'alter publication supabase_realtime add table public.about_section';
  end if;
end
$$;

insert into public.about_section (singleton_key, title, subtitle, paragraph1, paragraph2, paragraph3)
values (
  true,
  'Design the system before scaling the company.',
  'Saintce replaces scattered surfaces with one controllable operating layer.',
  'This build now reads from the live About CMS when content exists, so the public story can be managed directly from Saintce Control instead of being hardcoded across the frontend.',
  'The refactor removes duplicated admin flows and centralizes the data contract, which gives you a cleaner path to expand toward a fuller ERP-style back office.',
  'Every visible surface is moving toward one rule: fewer abstractions, fewer duplicate queries, and tighter control over performance and behavior.'
)
on conflict (singleton_key) do nothing;

commit;
