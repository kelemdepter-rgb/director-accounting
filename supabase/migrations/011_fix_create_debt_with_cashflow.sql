-- =============================================================================
-- 011_fix_create_debt_with_cashflow.sql
--
-- Reproduces the canonical create_debt_with_cashflow definition from migration
-- 008 and refreshes PostgREST's schema cache so the function can be called by
-- name through `supabase.rpc()`.
--
-- Why this migration exists
-- -------------------------
-- Production traffic surfaced
--
--     Could not find the function public.create_debt_with_cashflow(
--       p_contact_id, p_currency, p_description,
--       p_occurred_at, p_principal_amount, p_type
--     ) in the schema cache
--
-- whenever a user added a second transaction for an existing contact. The
-- migration in 008 declared the function with exactly those six named
-- parameters, so this error means one of three things on the deployed DB:
--
--   1. Migration 008 never ran in production (likeliest — Supabase only
--      applies what's pushed via `supabase db push`).
--   2. The signature drifted from a previous attempt — e.g. the function was
--      created with a different parameter order or names, leaving a stale
--      overload PostgREST cannot match the call against.
--   3. The schema cache was loaded before 008 ran and never reloaded — a
--      common cause is restoring a backup without poking pgrst.
--
-- Drop every variant we know about, recreate the canonical one, regrant
-- execute to `authenticated`, and NOTIFY pgrst to invalidate the cache.
-- The DROP statements are idempotent so the migration can be re-applied
-- without erroring on a healthy DB.
-- =============================================================================

begin;

-- Drop every plausible historical signature. The argument-name overloads are
-- what PostgREST routes against, so we have to enumerate them.
drop function if exists public.create_debt_with_cashflow(uuid, text, numeric, text, text, timestamptz);
drop function if exists public.create_debt_with_cashflow(uuid, text, numeric, text, text);
drop function if exists public.create_debt_with_cashflow(uuid, text, numeric, text);

-- Canonical definition. Must stay byte-for-byte aligned with the frontend
-- call in src/hooks/useDebts.ts → supabase.rpc('create_debt_with_cashflow').
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

commit;

-- Reload PostgREST's in-memory function catalogue so the next supabase.rpc()
-- call can resolve `create_debt_with_cashflow` by argument name. Issued
-- outside the transaction because NOTIFY is delivered at commit time.
notify pgrst, 'reload schema';
