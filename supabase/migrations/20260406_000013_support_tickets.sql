-- =====================================================================
-- Migration 000013: Support ticket system
-- =====================================================================

-- Ticket status and priority enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status' and typnamespace = 'public'::regnamespace) then
    create type public.ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_priority' and typnamespace = 'public'::regnamespace) then
    create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
  end if;
end;
$$;

-- Tickets table
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  subject text not null,
  description text not null,
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_client_id_idx on public.tickets (client_id);
create index if not exists tickets_project_id_idx on public.tickets (project_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

-- Ticket comments table
create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  body text not null,
  author_id uuid references auth.users (id) on delete set null,
  author_type text not null default 'admin', -- 'admin' | 'client'
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ticket_comments_ticket_id_idx on public.ticket_comments (ticket_id);
create index if not exists ticket_comments_created_at_idx on public.ticket_comments (created_at asc);

-- Auto-update updated_at on ticket change
create or replace function public.update_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists ticket_updated_at_trigger on public.tickets;
create trigger ticket_updated_at_trigger
  before update on public.tickets
  for each row execute function public.update_ticket_updated_at();

-- Auto-update ticket updated_at when a comment is added
create or replace function public.touch_ticket_on_comment()
returns trigger
language plpgsql
as $$
begin
  update public.tickets set updated_at = timezone('utc', now()) where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists ticket_comment_touch_trigger on public.ticket_comments;
create trigger ticket_comment_touch_trigger
  after insert on public.ticket_comments
  for each row execute function public.touch_ticket_on_comment();

-- RLS
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

-- Admin: full access
create policy "Admin full access on tickets"
  on public.tickets for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

create policy "Admin full access on ticket_comments"
  on public.ticket_comments for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- Portal clients: can see + create tickets for their own client record
create policy "Portal client read own tickets"
  on public.tickets for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = tickets.client_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Portal client insert own tickets"
  on public.tickets for insert to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = tickets.client_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

-- Portal clients: read + add comments on their own tickets
create policy "Portal client read own ticket_comments"
  on public.ticket_comments for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      join public.clients c on c.id = t.client_id
      where t.id = ticket_comments.ticket_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Portal client insert own ticket_comments"
  on public.ticket_comments for insert to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      join public.clients c on c.id = t.client_id
      where t.id = ticket_comments.ticket_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

-- Audit triggers
drop trigger if exists tickets_audit_trigger on public.tickets;
create trigger tickets_audit_trigger
  after insert or update or delete on public.tickets
  for each row execute function public.write_audit_log();
