-- =====================================================================
-- Migration 000015: File storage (Supabase Storage + metadata table)
-- =====================================================================

-- File metadata table (actual files live in Supabase Storage bucket)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'file_category' and typnamespace = 'public'::regnamespace) then
    create type public.file_category as enum ('document', 'contract', 'invoice', 'image', 'other');
  end if;
end;
$$;

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  storage_path text not null,            -- e.g. clients/{client_id}/{filename}
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  category public.file_category not null default 'document',
  description text,
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_by_type text not null default 'admin', -- 'admin' | 'client'
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_files_client_id_idx on public.client_files (client_id);
create index if not exists client_files_project_id_idx on public.client_files (project_id);
create index if not exists client_files_created_at_idx on public.client_files (created_at desc);

alter table public.client_files enable row level security;

-- Admin full access
create policy "Admin full access on client_files"
  on public.client_files for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- Portal: client can read their own files
create policy "Portal client read own files"
  on public.client_files for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_files.client_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

-- Portal: client can insert files for themselves
create policy "Portal client insert own files"
  on public.client_files for insert to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_files.client_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

-- NOTE: Supabase Storage bucket setup (run in Supabase dashboard or via management API):
-- bucket name: "client-files"
-- public: false (private, signed URLs only)
-- allowed MIME types: * (or restrict as needed)
-- max file size: 50MB
--
-- Storage RLS policies for bucket "client-files":
-- Admin can upload/download any path
-- Client can upload to: clients/{their_client_id}/*
-- Client can download from: clients/{their_client_id}/*
