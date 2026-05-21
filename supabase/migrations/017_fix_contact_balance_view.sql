-- =============================================================================
-- 017_fix_contact_balance_view.sql
--
-- Round 3 §5 — flip the cash_in / cash_out direction.
--
-- BACKGROUND
-- ----------
-- Round 1's commit fc596ab introduced an aggregator that did:
--   receivable_side = SUM(receivable.principal) + SUM(income.amount)
--   payable_side    = SUM(payable.principal)    + SUM(expense.amount)
-- That treated cash_in as if it were a new loan-out, which is wrong: when
-- someone gives you money, your receivable from them goes DOWN, not up.
-- The Round 2 cards inherited the wrong arithmetic from the aggregator.
--
-- INTENDED MODEL (per the user's restatement in Round 3 §5.1)
-- -----------------------------------------------------------
--   cash_in  ("they paid me")  reduces receivable; overflow → payable.
--   cash_out ("I paid them")   reduces payable;    overflow → receivable.
--
-- NOTE ON V3's LITERAL FORMULA
-- ----------------------------
-- V3 §5.2 wrote signed_rec = gross_rec + paid_out - paid_in and a separate
-- signed_pay = gross_pay + paid_in - paid_out, then a `greatest(0, ...)`
-- collapse. Plugging the matrix's step 3 (gross_rec=20k, gross_pay=15k,
-- paid_in=5k, paid_out=0) into that formula gives signed_rec=15k,
-- signed_pay=20k — both ≥0 → display (15k, 20k). The matrix expects
-- (15k, 15k). V3's formula double-counts cash_in by both subtracting it
-- from receivable AND adding it to payable; the matrix instead treats
-- it as a single reduction of receivable with overflow into payable only
-- when receivable would go negative.
--
-- This view implements the matrix (the user's source of truth) and not
-- V3's literal SQL. The matrix outputs are pinned by the SQL fixture in
-- supabase/tests/contact_balance.sql and by a TypeScript test suite in
-- __tests__/debtCalculation.test.ts.
--
-- SCHEMA MAPPING
-- --------------
-- V3's `cash_flow / cash_in / cash_out / alacak / borç` map to this repo's
-- `transactions / income / expense / receivable / payable`. The user
-- confirmed in Round 3 that the translation is correct; we do not rename
-- enum values to avoid migrating existing rows.
-- =============================================================================

begin;

drop view if exists public.v_contact_balance;

create view public.v_contact_balance as
with debts_agg as (
  -- debts_with_balance.remaining_amount is already net of formal payments
  -- (debt_payments rows + their auto-generated mirror transactions). Use
  -- it as the gross so a partial payment via record_debt_payment is
  -- reflected the same as a free-form cash_in.
  select
    contact_id,
    currency,
    sum(case when type = 'receivable' then remaining_amount else 0 end) as gross_receivable,
    sum(case when type = 'payable'    then remaining_amount else 0 end) as gross_payable
  from public.debts_with_balance
  where status = 'active'
  group by contact_id, currency
),
cash_agg as (
  -- Only MANUAL cash flows count here. auto_generated rows mirror
  -- debt_payments, which already reduced remaining_amount above; double-
  -- counting them would over-net the balance.
  select
    contact_id,
    currency,
    sum(case when type = 'income'  then amount else 0 end) as paid_in,
    sum(case when type = 'expense' then amount else 0 end) as paid_out
  from public.transactions
  where coalesce(auto_generated, false) = false
    and contact_id is not null
  group by contact_id, currency
),
merged as (
  select
    coalesce(d.contact_id, c.contact_id)               as contact_id,
    coalesce(d.currency,   c.currency)                 as currency,
    coalesce(d.gross_receivable, 0)::numeric           as gross_receivable,
    coalesce(d.gross_payable,    0)::numeric           as gross_payable,
    coalesce(c.paid_in,          0)::numeric           as paid_in,
    coalesce(c.paid_out,         0)::numeric           as paid_out
  from debts_agg d
  full outer join cash_agg c
    on d.contact_id = c.contact_id and d.currency = c.currency
),
raw as (
  -- Round 1 took cash flows on the SAME side as the debt; Round 3 inverts
  -- it. cash_in reduces receivable; cash_out reduces payable. Negatives
  -- are overflow that needs to spill onto the opposite side.
  select
    contact_id,
    currency,
    gross_receivable - paid_in  as raw_receivable,
    gross_payable    - paid_out as raw_payable
  from merged
)
select
  contact_id,
  currency,
  -- Collapse: if raw_receivable is negative, the excess cash_in became a
  -- new payable. Symmetric for cash_out. If BOTH go negative the user
  -- has overpaid in both directions, which swaps the sides.
  greatest(0, raw_receivable) + greatest(0, -raw_payable)    as net_receivable,
  greatest(0, raw_payable)    + greatest(0, -raw_receivable) as net_payable
from raw
where greatest(abs(raw_receivable), abs(raw_payable)) > 0.005;

grant select on public.v_contact_balance to authenticated;

commit;

notify pgrst, 'reload schema';
