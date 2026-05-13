-- =============================================================================
-- 001_initial_schema.sql
-- Director Accounting — core tables.
-- Run this BEFORE 002_rls_policies.sql and 003_triggers_and_views.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 200),
  phone_number text check (phone_number is null or length(phone_number) between 3 and 30),
  occupation text check (occupation is null or length(occupation) <= 200),
  notes text check (notes is null or length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_contacts_user_name on public.contacts(user_id, full_name);

-- -----------------------------------------------------------------------------
-- transactions (income / expense)
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(18, 2) not null check (amount > 0),
  currency text not null default 'USD' check (length(currency) = 3),
  description text check (description is null or length(description) <= 2000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date
  on public.transactions(user_id, occurred_at desc);
create index if not exists idx_transactions_contact
  on public.transactions(contact_id);

-- -----------------------------------------------------------------------------
-- debts
-- receivable = others owe me; payable = I owe others
-- -----------------------------------------------------------------------------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  type text not null check (type in ('receivable', 'payable')),
  principal_amount numeric(18, 2) not null check (principal_amount > 0),
  currency text not null check (length(currency) = 3),
  description text check (description is null or length(description) <= 2000),
  status text not null default 'active' check (status in ('active', 'settled')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists idx_debts_user_status on public.debts(user_id, status);
create index if not exists idx_debts_contact on public.debts(contact_id);

-- -----------------------------------------------------------------------------
-- debt_payments (each row = one partial or full payment on a debt)
-- -----------------------------------------------------------------------------
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_debt_payments_debt on public.debt_payments(debt_id);
create index if not exists idx_debt_payments_user on public.debt_payments(user_id);

commit;
