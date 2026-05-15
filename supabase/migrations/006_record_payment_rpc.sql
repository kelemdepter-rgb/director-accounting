-- =============================================================================
-- 006_record_payment_rpc.sql
-- Atomic payment-recording RPC. Replaces direct INSERTs on debt_payments.
--
-- Locks the parent debt FOR UPDATE, verifies ownership, rejects overpayment
-- and invalid amounts, inserts the payment, creates the matching cash
-- transaction (income for receivable, expense for payable), and flips the
-- debt to `settled` when fully paid — all in one transaction.
--
-- SQLSTATEs the RPC may raise (the client maps these to user-facing copy):
--   42501 — caller is not the debt's owner
--   23514 — amount would exceed the remaining balance
--   22023 — amount is null, zero, or non-positive
--   22000 — debt is already settled
-- =============================================================================

begin;

-- The RPC also creates a row in `transactions` and links it back from the
-- payment row, so reports show one source of truth for cash flow.
alter table public.debt_payments
  add column if not exists transaction_id uuid
    references public.transactions(id) on delete set null;

create index if not exists idx_debt_payments_transaction
  on public.debt_payments(transaction_id);

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
  v_payment_id uuid;
  v_tx_type text;
  v_new_status text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;

  -- Lock the parent debt for the duration of this transaction so concurrent
  -- payments can't both pass the overpayment check.
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

  -- Matching cash transaction: receivable -> income, payable -> expense.
  v_tx_type := case when v_debt.type = 'receivable' then 'income' else 'expense' end;

  insert into public.transactions (
    user_id, contact_id, type, amount, currency, description, occurred_at
  )
  values (
    v_uid,
    v_debt.contact_id,
    v_tx_type,
    p_amount,
    v_debt.currency,
    coalesce(p_note, v_debt.description),
    p_paid_at
  )
  returning id into v_tx_id;

  insert into public.debt_payments (
    debt_id, user_id, amount, paid_at, note, transaction_id
  )
  values (
    p_debt_id, v_uid, p_amount, p_paid_at, p_note, v_tx_id
  )
  returning id into v_payment_id;

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

revoke all on function public.record_debt_payment(uuid, numeric, text, timestamptz) from public;
grant execute on function public.record_debt_payment(uuid, numeric, text, timestamptz) to authenticated;

commit;
