-- =============================================================================
-- 007_recalc_debt_status.sql
-- Replaces the insert-only auto-settle trigger with a defensive recalc that
-- runs on insert, update, AND delete of `debt_payments`. The atomic payment
-- RPC (006) is the primary path; this trigger handles edge cases like manual
-- SQL edits, payment deletions, or amount corrections so the debt's
-- `status` / `settled_at` never drift from the sum of its payments.
--
-- Expected post-migration trigger list on public.debt_payments
-- (run: select tgname from pg_trigger
--          where tgrelid = 'public.debt_payments'::regclass;):
--   trg_debt_payments_recalc
-- The old `trg_debt_payments_auto_settle` should NOT appear.
-- =============================================================================

begin;

create or replace function public.recalc_debt_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debt_id uuid := coalesce(new.debt_id, old.debt_id);
  v_total_paid numeric(18, 2);
  v_principal numeric(18, 2);
begin
  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.debt_payments
   where debt_id = v_debt_id;

  select principal_amount
    into v_principal
    from public.debts
   where id = v_debt_id;

  if v_principal is null then
    return coalesce(new, old);
  end if;

  if v_total_paid >= v_principal then
    update public.debts
       set status = 'settled',
           settled_at = coalesce(settled_at, now())
     where id = v_debt_id
       and status <> 'settled';
  else
    update public.debts
       set status = 'active',
           settled_at = null
     where id = v_debt_id
       and status = 'settled';
  end if;

  return coalesce(new, old);
end;
$$;

-- Drop the old insert-only auto-settle trigger and its function.
drop trigger if exists trg_debt_payments_auto_settle on public.debt_payments;
drop function if exists public.auto_settle_debt_on_payment();

drop trigger if exists trg_debt_payments_recalc on public.debt_payments;
create trigger trg_debt_payments_recalc
  after insert or update or delete on public.debt_payments
  for each row execute function public.recalc_debt_status();

commit;
