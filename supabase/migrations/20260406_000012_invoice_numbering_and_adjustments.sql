-- =====================================================================
-- Migration 000012: Robust invoice numbering + adjustment invoices
-- =====================================================================

-- 1. Invoice sequences table — atomic per-year counter (replaces COUNT(*) approach)
create table if not exists public.invoice_sequences (
  year text primary key,
  last_sequence integer not null default 0
);

alter table public.invoice_sequences enable row level security;

create policy "Admin full access on invoice_sequences"
  on public.invoice_sequences
  for all
  to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- 2. Replace get_next_invoice_number — now atomic via INSERT ... ON CONFLICT DO UPDATE
create or replace function public.get_next_invoice_number(p_issue_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(p_issue_date, 'YYYY');
  v_sequence integer;
begin
  insert into public.invoice_sequences (year, last_sequence)
  values (v_year, 1)
  on conflict (year) do update
    set last_sequence = invoice_sequences.last_sequence + 1
  returning last_sequence into v_sequence;

  return format('INV-%s-%s', v_year, lpad(v_sequence::text, 4, '0'));
end;
$$;

-- 3. Seed the sequence table from existing invoices so numbers don't reset
do $$
declare
  r record;
begin
  for r in
    select
      to_char(issue_date, 'YYYY') as yr,
      count(*) as cnt
    from public.invoices
    where invoice_number like 'INV-%'
    group by to_char(issue_date, 'YYYY')
  loop
    insert into public.invoice_sequences (year, last_sequence)
    values (r.yr, r.cnt)
    on conflict (year) do update
      set last_sequence = greatest(invoice_sequences.last_sequence, excluded.last_sequence);
  end loop;
end;
$$;

-- 4. Invoice type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_type' and typnamespace = 'public'::regnamespace) then
    create type public.invoice_type as enum ('standard', 'adjustment', 'credit_note');
  end if;
end;
$$;

-- 5. Add invoice_type column to invoices
alter table public.invoices
  add column if not exists invoice_type public.invoice_type not null default 'standard';

-- 6. get_next_adjustment_number — separate sequence for adjustments (ADJ-YYYY-NNNN)
create table if not exists public.adjustment_sequences (
  year text primary key,
  last_sequence integer not null default 0
);

alter table public.adjustment_sequences enable row level security;

create policy "Admin full access on adjustment_sequences"
  on public.adjustment_sequences
  for all
  to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

create or replace function public.get_next_adjustment_number(p_issue_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(p_issue_date, 'YYYY');
  v_sequence integer;
begin
  insert into public.adjustment_sequences (year, last_sequence)
  values (v_year, 1)
  on conflict (year) do update
    set last_sequence = adjustment_sequences.last_sequence + 1
  returning last_sequence into v_sequence;

  return format('ADJ-%s-%s', v_year, lpad(v_sequence::text, 4, '0'));
end;
$$;

-- 7. create_adjustment_invoice — admin function to create adjustment/credit invoices
create or replace function public.create_adjustment_invoice(
  p_subscription_id uuid,
  p_amount numeric,
  p_issue_date date,
  p_due_date date,
  p_invoice_type public.invoice_type default 'adjustment'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
begin
  if p_invoice_type = 'standard' then
    v_invoice_number := public.get_next_invoice_number(p_issue_date);
  else
    v_invoice_number := public.get_next_adjustment_number(p_issue_date);
  end if;

  insert into public.invoices (
    subscription_id,
    invoice_number,
    amount,
    status,
    issue_date,
    due_date,
    invoice_type
  ) values (
    p_subscription_id,
    v_invoice_number,
    p_amount,
    'issued',
    p_issue_date,
    p_due_date,
    p_invoice_type
  ) returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

grant execute on function public.create_adjustment_invoice to authenticated;
grant execute on function public.get_next_adjustment_number to authenticated;

-- 8. failed_payment_retries log table
create table if not exists public.payment_retry_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  stripe_invoice_id text,
  status text not null, -- 'success' | 'failed' | 'skipped'
  error_message text,
  retried_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_retry_logs_invoice_id_idx on public.payment_retry_logs (invoice_id);
create index if not exists payment_retry_logs_retried_at_idx on public.payment_retry_logs (retried_at desc);

alter table public.payment_retry_logs enable row level security;

create policy "Admin full access on payment_retry_logs"
  on public.payment_retry_logs
  for all
  to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());
