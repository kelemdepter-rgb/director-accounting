-- =============================================================================
-- 008_debt_cash_link.sql
-- Link every debt and debt-payment to a matching row in `transactions`, so
-- the dashboard's income / expense totals reflect real cash movement.
--
-- Adds:
--   * `transactions.debt_id`           — parent debt for both auto-generated
--                                        rows (debt creation + each payment).
--   * `transactions.debt_payment_id`   — set when the transaction was created
--                                        by a specific `record_debt_payment`
--                                        call. NULL for the debt-creation row.
--   * `transactions.auto_generated`    — true for any row the system created
--                                        on behalf of the user. The UI uses
--                                        this to disable manual edit/delete
--                                        and link back to the parent debt.
--
-- Adds RPC `create_debt_with_cashflow` and updates `record_debt_payment` (006)
-- to populate the new columns.
--
-- NOTE: This migration does NOT retroactively create transactions for debts
-- that existed before it ran. A separate one-off backfill script is the right
-- tool for that — keeping it out of the migration avoids surprises in
-- already-balanced ledgers.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Schema additions
-- -----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists debt_id uuid
    references public.debts(id) on delete set null;

alter table public.transactions
  add column if not exists debt_payment_id uuid
    references public.debt_payments(id) on delete set null;

alter table public.transactions
  add column if not exists auto_generated boolean not null default false;

create index if not exists idx_transactions_debt
  on public.transactions(debt_id);
create index if not exists idx_transactions_debt_payment
  on public.transactions(debt_payment_id);

-- -----------------------------------------------------------------------------
-- create_debt_with_cashflow
--   * Inserts a debt row.
--   * Inserts a paired cash transaction:
--       - receivable (I lent money out)   → expense
--       - payable    (I borrowed money in) → income
--   * Returns the new debt + transaction ids.
--
-- SQLSTATEs the RPC may raise:
--   42501 — caller does not own the referenced contact
--   22023 — principal_amount is null, zero, or non-positive
-- -----------------------------------------------------------------------------
create or replace function public.create_debt_with_cashflow(
  p_contact_id uuid,
  p_type text,
  p_principal_amount numeric,
  p_currency text,
  p_description text default null,
  p_occurred_at timestamptz default now()
)
returns table (
  debt_id uuid,
  transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_contact_owner uuid;
  v_debt_id uuid;
  v_tx_id uuid;
  v_tx_type text;
begin
  if p_principal_amount is null or p_principal_amount <= 0 then
    raise exception 'principal_amount must be positive' using errcode = '22023';
  end if;

  if p_type not in ('receivable', 'payable') then
    raise exception 'invalid debt type' using errcode = '22023';
  end if;

  select user_id into v_contact_owner
    from public.contacts
   where id = p_contact_id;

  if v_contact_owner is null or v_contact_owner <> v_uid then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  insert into public.debts (
    user_id, contact_id, type, principal_amount, currency, description, created_at
  )
  values (
    v_uid, p_contact_id, p_type, p_principal_amount, p_currency, p_description, p_occurred_at
  )
  returning id into v_debt_id;

  -- receivable = cash leaves the user's pocket; payable = cash arrives.
  v_tx_type := case when p_type = 'receivable' then 'expense' else 'income' end;

  insert into public.transactions (
    user_id, contact_id, type, amount, currency, description, occurred_at,
    debt_id, auto_generated
  )
  values (
    v_uid, p_contact_id, v_tx_type, p_principal_amount, p_currency, p_description, p_occurred_at,
    v_debt_id, true
  )
  returning id into v_tx_id;

  debt_id := v_debt_id;
  transaction_id := v_tx_id;
  return next;
end;
$$;

revoke all on function public.create_debt_with_cashflow(uuid, text, numeric, text, text, timestamptz) from public;
grant execute on function public.create_debt_with_cashflow(uuid, text, numeric, text, text, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- Replace record_debt_payment (006) so it also stamps debt_id /
-- debt_payment_id / auto_generated on the linked transaction.
-- Behaviour and error contract are identical to 006.
-- -----------------------------------------------------------------------------
create or replace function public.record_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_note text default null,
  p_paid_at timestamptz default now()
)
returns table (
  paid_amount numeric,
  remaining_amount numeric,
  debt_status text,
  transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_total_paid numeric(18, 2);
  v_remaining numeric(18, 2);
  v_tx_id uuid;
  v_payment_id uuid := gen_random_uuid();
  v_tx_type text;
  v_new_status text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;

  select * into v_debt
    from public.debts
   where id = p_debt_id
   for update;

  if not found then
    raise exception 'debt not found' using errcode = '42501';
  end if;

  if v_debt.user_id <> v_uid then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  if v_debt.status = 'settled' then
    raise exception 'debt already settled' using errcode = '22000';
  end if;

  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.debt_payments
   where debt_id = p_debt_id;

  v_remaining := v_debt.principal_amount - v_total_paid;

  if p_amount > v_remaining then
    raise exception 'payment exceeds remaining balance' using errcode = '23514';
  end if;

  -- Receivable payment: contact pays me → income. Payable: I pay contact → expense.
  v_tx_type := case when v_debt.type = 'receivable' then 'income' else 'expense' end;

  insert into public.transactions (
    user_id, contact_id, type, amount, currency, description, occurred_at,
    debt_id, debt_payment_id, auto_generated
  )
  values (
    v_uid,
    v_debt.contact_id,
    v_tx_type,
    p_amount,
    v_debt.currency,
    coalesce(p_note, v_debt.description),
    p_paid_at,
    v_debt.id,
    v_payment_id,
    true
  )
  returning id into v_tx_id;

  insert into public.debt_payments (
    id, debt_id, user_id, amount, paid_at, note, transaction_id
  )
  values (
    v_payment_id, p_debt_id, v_uid, p_amount, p_paid_at, p_note, v_tx_id
  );

  v_total_paid := v_total_paid + p_amount;
  v_remaining := v_debt.principal_amount - v_total_paid;

  if v_remaining <= 0 then
    update public.debts
       set status = 'settled',
           settled_at = coalesce(settled_at, now())
     where id = p_debt_id;
    v_new_status := 'settled';
  else
    v_new_status := v_debt.status;
  end if;

  paid_amount := v_total_paid;
  remaining_amount := v_remaining;
  debt_status := v_new_status;
  transaction_id := v_tx_id;
  return next;
end;
$$;

commit;
