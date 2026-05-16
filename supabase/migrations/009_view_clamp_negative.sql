-- =============================================================================
-- 009_view_clamp_negative.sql
-- The `debts_with_balance` view from 003 subtracts payments from principal.
-- A historical over-payment, an in-flight edit, or floating-point drift
-- could leave `remaining_amount` slightly negative — which UI code that
-- formats it as currency or uses it for progress bars copes with poorly.
--
-- Clamp the value at zero. record_debt_payment (006) still rejects an
-- over-payment before it reaches the database, so this guard only fires
-- against legacy / out-of-band rows.
-- =============================================================================

begin;

create or replace view public.debts_with_balance
  with (security_invoker = true)
as
select
  d.id,
  d.user_id,
  d.contact_id,
  d.type,
  d.principal_amount,
  d.currency,
  d.description,
  d.status,
  d.created_at,
  d.settled_at,
  coalesce(sum(p.amount), 0)::numeric(18, 2) as paid_amount,
  greatest(
    0,
    d.principal_amount - coalesce(sum(p.amount), 0)
  )::numeric(18, 2) as remaining_amount
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id;

commit;
