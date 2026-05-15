-- =============================================================================
-- 010_payment_audit.sql
-- Audit columns on debt_payments plus Postgres-side cascade keeping the
-- auto-generated cash transaction in sync when a payment is edited or
-- removed. Doing the cascade in the database (not the client) means the
-- books can't drift even if the client crashes between two API calls.
--
-- IMPORTANT: this migration must NOT redefine the RLS policies on
-- debt_payments. The existing `debt_payments_update_own` /
-- `debt_payments_delete_own` policies from 002 enforce ownership via the
-- per-row user_id (every payment carries the same user_id as its parent
-- debt — see the record_debt_payment RPC), and we want them left alone.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Audit columns
-- -----------------------------------------------------------------------------
-- created_at already exists from 001_initial_schema.sql — do NOT redefine.
alter table public.debt_payments
  add column if not exists updated_at timestamptz not null default now();
alter table public.debt_payments
  add column if not exists edited_count integer not null default 0;

-- -----------------------------------------------------------------------------
-- Audit trigger: stamp updated_at and bump edited_count on real edits.
--
-- We compare amount / paid_at / note so internal no-op updates (none expected
-- today, but defensive) do not inflate the counter.
-- -----------------------------------------------------------------------------
create or replace function public.bump_debt_payment_audit()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.amount is distinct from old.amount
     or new.paid_at is distinct from old.paid_at
     or new.note is distinct from old.note then
    new.edited_count := old.edited_count + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_debt_payments_audit on public.debt_payments;
create trigger trg_debt_payments_audit
  before update on public.debt_payments
  for each row execute function public.bump_debt_payment_audit();

-- -----------------------------------------------------------------------------
-- Cascade trigger: keep the linked auto-generated transaction in lock-step.
--
-- DELETE runs BEFORE the row vanishes, because `transactions.debt_payment_id`
-- has ON DELETE SET NULL (008). If we ran AFTER DELETE, the column would
-- already be NULL and our WHERE clause would not match the orphaned row.
-- UPDATE runs AFTER UPDATE — new.* values are final, no contention with the
-- audit trigger above.
-- -----------------------------------------------------------------------------
create or replace function public.cascade_payment_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    update public.transactions
       set amount = new.amount,
           occurred_at = new.paid_at,
           description = new.note
     where debt_payment_id = new.id;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.transactions
     where debt_payment_id = old.id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_debt_payments_cascade_update on public.debt_payments;
create trigger trg_debt_payments_cascade_update
  after update on public.debt_payments
  for each row execute function public.cascade_payment_to_transaction();

drop trigger if exists trg_debt_payments_cascade_delete on public.debt_payments;
create trigger trg_debt_payments_cascade_delete
  before delete on public.debt_payments
  for each row execute function public.cascade_payment_to_transaction();

commit;
