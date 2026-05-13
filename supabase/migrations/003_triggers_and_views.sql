-- =============================================================================
-- 003_triggers_and_views.sql
-- Auto-updated timestamps, auto-settle trigger, and the debts_with_balance view.
-- Run AFTER 002_rls_policies.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- updated_at trigger for contacts
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contacts_set_updated_at on public.contacts;
create trigger trg_contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-settle debt when total payments meet or exceed principal
-- -----------------------------------------------------------------------------
create or replace function public.auto_settle_debt_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_paid numeric(18, 2);
  principal numeric(18, 2);
begin
  select coalesce(sum(amount), 0)
    into total_paid
    from public.debt_payments
   where debt_id = new.debt_id;

  select principal_amount
    into principal
    from public.debts
   where id = new.debt_id;

  if principal is not null and total_paid >= principal then
    update public.debts
       set status = 'settled',
           settled_at = coalesce(settled_at, now())
     where id = new.debt_id
       and status <> 'settled';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_debt_payments_auto_settle on public.debt_payments;
create trigger trg_debt_payments_auto_settle
  after insert on public.debt_payments
  for each row execute function public.auto_settle_debt_on_payment();

-- -----------------------------------------------------------------------------
-- View: debts_with_balance
-- Computed: paid_amount and remaining_amount per debt.
-- security_invoker so the underlying RLS policies on `debts` and `debt_payments`
-- apply to the caller (not the view owner). Postgres 15+.
-- -----------------------------------------------------------------------------
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
  (d.principal_amount - coalesce(sum(p.amount), 0))::numeric(18, 2) as remaining_amount
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id;

commit;
