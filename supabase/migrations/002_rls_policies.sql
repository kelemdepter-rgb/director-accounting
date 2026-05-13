-- =============================================================================
-- 002_rls_policies.sql
-- Row Level Security: every table is locked to its owning auth user.
-- Run AFTER 001_initial_schema.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
alter table public.contacts enable row level security;

drop policy if exists "contacts_select_own" on public.contacts;
drop policy if exists "contacts_insert_own" on public.contacts;
drop policy if exists "contacts_update_own" on public.contacts;
drop policy if exists "contacts_delete_own" on public.contacts;

create policy "contacts_select_own" on public.contacts
  for select using (auth.uid() = user_id);
create policy "contacts_insert_own" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "contacts_update_own" on public.contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contacts_delete_own" on public.contacts
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- debts
-- -----------------------------------------------------------------------------
alter table public.debts enable row level security;

drop policy if exists "debts_select_own" on public.debts;
drop policy if exists "debts_insert_own" on public.debts;
drop policy if exists "debts_update_own" on public.debts;
drop policy if exists "debts_delete_own" on public.debts;

create policy "debts_select_own" on public.debts
  for select using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts
  for insert with check (auth.uid() = user_id);
create policy "debts_update_own" on public.debts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- debt_payments
-- -----------------------------------------------------------------------------
alter table public.debt_payments enable row level security;

drop policy if exists "debt_payments_select_own" on public.debt_payments;
drop policy if exists "debt_payments_insert_own" on public.debt_payments;
drop policy if exists "debt_payments_update_own" on public.debt_payments;
drop policy if exists "debt_payments_delete_own" on public.debt_payments;

create policy "debt_payments_select_own" on public.debt_payments
  for select using (auth.uid() = user_id);
create policy "debt_payments_insert_own" on public.debt_payments
  for insert with check (auth.uid() = user_id);
create policy "debt_payments_update_own" on public.debt_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debt_payments_delete_own" on public.debt_payments
  for delete using (auth.uid() = user_id);

commit;
