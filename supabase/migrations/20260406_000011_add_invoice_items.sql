-- Invoice items breakdown
-- Allows invoices to have multiple line items instead of a single amount

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null,
  total numeric(12, 2) generated always as (quantity * unit_price) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id, sort_order);

-- RLS
alter table public.invoice_items enable row level security;

-- Admin can do everything
create policy "Admin full access on invoice_items"
  on public.invoice_items
  for all
  to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- Portal clients can read their own invoice items via invoice ownership chain
create policy "Portal clients read own invoice_items"
  on public.invoice_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.invoices inv
      join public.subscriptions sub on sub.id = inv.subscription_id
      join public.services svc on svc.id = sub.service_id
      join public.projects proj on proj.id = svc.project_id
      join public.clients cl on cl.id = proj.client_id
      where inv.id = invoice_items.invoice_id
        and cl.email ilike (select email from auth.users where id = auth.uid() limit 1)
    )
  );

-- Notification log table
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  notification_type text,
  invoice_id uuid references public.invoices(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_logs_client_id_idx on public.notification_logs (client_id, sent_at desc);
create index if not exists notification_logs_invoice_id_idx on public.notification_logs (invoice_id);
create index if not exists notification_logs_sent_at_idx on public.notification_logs (sent_at desc);

alter table public.notification_logs enable row level security;

create policy "Admin full access on notification_logs"
  on public.notification_logs
  for all
  to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());
