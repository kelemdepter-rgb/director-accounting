-- =============================================================================
-- 019_create_debt_with_service_type.sql
--
-- Round 5 §1 — extend `create_debt_with_cashflow` to persist `service_type`
-- and `service_type_other` on both the debt and its mirrored transaction
-- row. Without this the new pills on the entry form would silently drop
-- their value: the RPC was the only writer for debts + cashflow pairs.
--
-- PostgREST resolves function overloads by *exact* set of argument names,
-- so we must drop the previous signature and create the new one. The
-- frontend's `buildCreateDebtRpcParams` (src/lib/debtRpcParams.ts) is
-- updated in the same commit batch to always emit the two new keys (with
-- nulls when the user didn't pick a service type), so the call matches
-- the new signature.
-- =============================================================================

begin;

-- Drop every previously-shipped signature.
drop function if exists public.create_debt_with_cashflow(uuid, text, numeric, text, text, timestamptz);
drop function if exists public.create_debt_with_cashflow(uuid, text, numeric, text, text);

create or replace function public.create_debt_with_cashflow(
  p_contact_id         uuid,
  p_type               text,
  p_principal_amount   numeric,
  p_currency           text,
  p_description        text default null,
  p_occurred_at        timestamptz default now(),
  p_service_type       public.contact_service_type default null,
  p_service_type_other text default null
)
returns table (
  debt_id        uuid,
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
  v_st_other text := nullif(btrim(coalesce(p_service_type_other, '')), '');
begin
  if p_principal_amount is null or p_principal_amount <= 0 then
    raise exception 'principal_amount must be positive' using errcode = '22023';
  end if;

  if p_type not in ('receivable', 'payable') then
    raise exception 'invalid debt type' using errcode = '22023';
  end if;

  -- Mirror the table CHECK so a bad payload fails with a clear error
  -- before we try to insert (and explode at the constraint level).
  if (p_service_type = 'other' and v_st_other is null)
  or (p_service_type is distinct from 'other' and v_st_other is not null) then
    raise exception 'service_type_other_mismatch' using errcode = '22023';
  end if;

  select user_id into v_contact_owner
    from public.contacts
   where id = p_contact_id;

  if v_contact_owner is null or v_contact_owner <> v_uid then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  insert into public.debts (
    user_id, contact_id, type, principal_amount, currency, description,
    created_at, service_type, service_type_other
  )
  values (
    v_uid, p_contact_id, p_type, p_principal_amount, p_currency, p_description,
    p_occurred_at, p_service_type, v_st_other
  )
  returning id into v_debt_id;

  -- receivable = cash leaves the user's pocket; payable = cash arrives.
  v_tx_type := case when p_type = 'receivable' then 'expense' else 'income' end;

  insert into public.transactions (
    user_id, contact_id, type, amount, currency, description, occurred_at,
    debt_id, auto_generated, service_type, service_type_other
  )
  values (
    v_uid, p_contact_id, v_tx_type, p_principal_amount, p_currency, p_description, p_occurred_at,
    v_debt_id, true, p_service_type, v_st_other
  )
  returning id into v_tx_id;

  debt_id := v_debt_id;
  transaction_id := v_tx_id;
  return next;
end;
$$;

revoke all on function public.create_debt_with_cashflow(
  uuid, text, numeric, text, text, timestamptz,
  public.contact_service_type, text
) from public;

grant execute on function public.create_debt_with_cashflow(
  uuid, text, numeric, text, text, timestamptz,
  public.contact_service_type, text
) to authenticated;

commit;

notify pgrst, 'reload schema';
