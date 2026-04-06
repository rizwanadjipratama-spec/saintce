-- =====================================================================
-- Migration 000014: Discount, Tax/VAT, Refunds, Client Credit Balance
-- =====================================================================

-- 1. Invoices: add discount and tax columns
alter table public.invoices
  add column if not exists discount_percent numeric(5, 2) not null default 0,
  add column if not exists discount_amount  numeric(12, 2) not null default 0,
  add column if not exists tax_rate         numeric(5, 2) not null default 0,
  add column if not exists tax_amount       numeric(12, 2) not null default 0,
  add column if not exists subtotal         numeric(12, 2),
  add column if not exists notes            text;

-- 2. Client credits table — manual credit balance per client
create table if not exists public.client_credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  amount numeric(12, 2) not null,
  description text not null,
  applied_invoice_id uuid references public.invoices (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_credits_client_id_idx on public.client_credits (client_id);

alter table public.client_credits enable row level security;

create policy "Admin full access on client_credits"
  on public.client_credits for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- Portal clients can view their own credits
create policy "Portal client read own credits"
  on public.client_credits for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_credits.client_id
        and c.email = (select email from auth.users where id = auth.uid())
    )
  );

-- 3. Refunds table
do $$
begin
  if not exists (select 1 from pg_type where typname = 'refund_status' and typnamespace = 'public'::regnamespace) then
    create type public.refund_status as enum ('pending', 'processed', 'failed');
  end if;
end;
$$;

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  amount numeric(12, 2) not null,
  reason text,
  status public.refund_status not null default 'pending',
  stripe_refund_id text,
  refunded_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists refunds_payment_id_idx on public.refunds (payment_id);
create index if not exists refunds_created_at_idx on public.refunds (created_at desc);

alter table public.refunds enable row level security;

create policy "Admin full access on refunds"
  on public.refunds for all to authenticated
  using (public.is_saintce_admin())
  with check (public.is_saintce_admin());

-- 4. Helper: get client credit balance (sum of credits minus applied)
create or replace function public.get_client_credit_balance(p_client_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.client_credits
  where client_id = p_client_id;
$$;

grant execute on function public.get_client_credit_balance to authenticated;
