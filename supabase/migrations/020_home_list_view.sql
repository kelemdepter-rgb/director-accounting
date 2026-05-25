-- =============================================================================
-- 020_home_list_view.sql
--
-- Round 5 §2 — view that powers the new home page.
--
-- The home page now shows a two-section list (people who owe me / people I
-- owe), one row per (contact, currency) with the contact's name, the
-- latest transaction date, the latest transaction's service type, and the
-- net receivable / payable amount.
--
-- Building this on the client would mean three round-trips and a giant
-- JS-side aggregation per render. A view collapses it to a single
-- supabase.from('v_home_list').select('*') call with the join + group-by
-- done where they belong.
--
-- Design:
--   * `v_contact_balance` (migration 017) already gives the netted
--     (receivable, payable) per (contact, currency). We reuse it.
--   * For the "latest transaction" decoration we union ALL debts (status
--     irrelevant — a recently-settled debt is still the user's most
--     recent action, and we want to surface that date) and ALL
--     transactions (auto-generated payments included, so a payment from
--     yesterday wins over a debt from last month). arg-max is implemented
--     with `(array_agg(... order by occurred_at desc nulls last))[1]` —
--     Postgres has no FIRST_VALUE-on-aggregate, this idiom is the
--     standard substitute.
--   * `security_invoker = true` so RLS runs as the querying user. Without
--     it the view runs as its owner (postgres) and bypasses RLS, which
--     would leak everyone's rows to everyone. Requires PG 15+, which
--     Supabase runs.
--
-- Verify after applying:
--   select count(*) from public.v_home_list;            -- per-user count
--   select sum(net_receivable), sum(net_payable)
--     from public.v_home_list group by currency;        -- spot-check totals
-- =============================================================================

begin;

drop view if exists public.v_home_list;

create view public.v_home_list
with (security_invoker = true)
as
with activity as (
  -- Manual + auto-generated transactions both count for "when did I last
  -- touch this contact". The user wants the most recent activity date —
  -- a payment from yesterday should outrank the debt that opened a month
  -- ago.
  select
    contact_id,
    currency,
    occurred_at,
    service_type,
    service_type_other
  from public.transactions
  where contact_id is not null
  union all
  -- Treat each debt as an activity at its created_at (set via
  -- p_occurred_at on insert), so the most-recent debt's service_type
  -- becomes the badge when there are no later transactions.
  select
    contact_id,
    currency,
    created_at as occurred_at,
    service_type,
    service_type_other
  from public.debts
),
latest as (
  select
    contact_id,
    currency,
    max(occurred_at) as last_at,
    -- arg-max of service_type by occurred_at, ignoring rows that have no
    -- service_type so a recent untagged manual transaction does not
    -- erase the badge from an older tagged debt.
    (array_agg(service_type order by occurred_at desc)
       filter (where service_type is not null))[1] as last_service_type,
    (array_agg(service_type_other order by occurred_at desc)
       filter (where service_type is not null))[1] as last_service_type_other,
    -- Used by the UI to show a small "+N" hint when this contact has
    -- multiple distinct service types open.
    count(distinct service_type)
      filter (where service_type is not null) as service_type_count
  from activity
  group by contact_id, currency
)
select
  b.contact_id,
  b.currency,
  c.full_name,
  c.phone_number,
  b.net_receivable,
  b.net_payable,
  l.last_at,
  l.last_service_type,
  l.last_service_type_other,
  coalesce(l.service_type_count, 0) as service_type_count
from public.v_contact_balance b
join public.contacts c on c.id = b.contact_id
left join latest l
  on l.contact_id = b.contact_id and l.currency = b.currency
where b.net_receivable > 0 or b.net_payable > 0;

grant select on public.v_home_list to authenticated;

commit;

notify pgrst, 'reload schema';
