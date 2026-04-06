-- =====================================================================
-- Migration 000016: Permission per project
-- =====================================================================

-- project_permissions: explicit allow-list for project access
-- If a project has NO rows here, the default is: allow client email match (existing behavior)
-- If a project HAS rows here, ONLY listed emails have access (strict mode)

create table if not exists public.project_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, email)
);

create index if not exists project_permissions_project_id_idx on public.project_permissions (project_id);
create index if not exists project_permissions_email_idx on public.project_permissions (email);

alter table public.project_permissions enable row level security;

create policy "Admin full access on project_permissions"
  on public.project_permissions for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- Helper: check if a user email has explicit permission for a project
-- Returns true if:
--   a) No permissions rows exist for the project (open access within client chain)
--   b) An explicit row exists for this email
create or replace function public.has_project_permission(p_project_id uuid, p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    -- No explicit permissions defined = open (client chain RLS still applies)
    not exists (select 1 from public.project_permissions where project_id = p_project_id)
    or
    -- Explicit permission exists for this email
    exists (select 1 from public.project_permissions where project_id = p_project_id and email = lower(p_email));
$$;

grant execute on function public.has_project_permission to authenticated;

-- Add is_strict_access column to projects: when true, only emails in project_permissions can access
alter table public.projects
  add column if not exists is_strict_access boolean not null default false;
