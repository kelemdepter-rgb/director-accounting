-- =============================================================================
-- supabase/tests/contact_balance.sql
--
-- SQL fixture for the Round 3 §5.5 matrix. Runs the same step-by-step
-- scenario that the Vitest suite in __tests__/debtCalculation.test.ts
-- pins on the TypeScript aggregator, and asserts the server-side view
-- v_contact_balance returns identical totals.
--
-- USAGE
--   psql "$SUPABASE_URL" -f supabase/tests/contact_balance.sql
--
-- The script runs inside a savepoint that is rolled back at the end, so
-- repeated runs do not leak fixture rows into the live database.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- Make sure we are running as an authenticated user. The view inherits
-- the RLS context from auth.uid(); for the fixture we pin a UUID and
-- use it for every insert + assertion.
do $$
declare
  v_uid uuid := '00000000-0000-0000-0000-00000000c001';
  v_contact uuid;
  v_currency text := 'TRY';
  v_rec numeric;
  v_pay numeric;
begin
  -- Seed contact (cascades will clean up via ROLLBACK).
  insert into public.contacts (id, user_id, full_name, phone_number)
  values (gen_random_uuid(), v_uid, 'Fixture Contact', '5551234567')
  returning id into v_contact;

  -- Step 1 — alacak 20k → (20k, 0)
  insert into public.debts (user_id, contact_id, type, principal_amount, currency, status)
  values (v_uid, v_contact, 'receivable', 20000, v_currency, 'active');

  select net_receivable, net_payable into v_rec, v_pay
    from public.v_contact_balance
   where contact_id = v_contact and currency = v_currency;
  assert v_rec = 20000, format('Step 1 receivable expected 20000, got %s', v_rec);
  assert v_pay = 0,     format('Step 1 payable expected 0, got %s',        v_pay);

  -- Step 2 — borç 15k → (20k, 15k)
  insert into public.debts (user_id, contact_id, type, principal_amount, currency, status)
  values (v_uid, v_contact, 'payable', 15000, v_currency, 'active');

  select net_receivable, net_payable into v_rec, v_pay
    from public.v_contact_balance
   where contact_id = v_contact and currency = v_currency;
  assert v_rec = 20000, format('Step 2 receivable expected 20000, got %s', v_rec);
  assert v_pay = 15000, format('Step 2 payable expected 15000, got %s',    v_pay);

  -- Step 3 — cash_in 5k → (15k, 15k)
  insert into public.transactions
    (user_id, contact_id, type, amount, currency, auto_generated)
  values (v_uid, v_contact, 'income', 5000, v_currency, false);

  select net_receivable, net_payable into v_rec, v_pay
    from public.v_contact_balance
   where contact_id = v_contact and currency = v_currency;
  assert v_rec = 15000, format('Step 3 receivable expected 15000, got %s', v_rec);
  assert v_pay = 15000, format('Step 3 payable expected 15000, got %s',    v_pay);

  -- Step 4 — cash_out 3k → (15k, 12k)
  insert into public.transactions
    (user_id, contact_id, type, amount, currency, auto_generated)
  values (v_uid, v_contact, 'expense', 3000, v_currency, false);

  select net_receivable, net_payable into v_rec, v_pay
    from public.v_contact_balance
   where contact_id = v_contact and currency = v_currency;
  assert v_rec = 15000, format('Step 4 receivable expected 15000, got %s', v_rec);
  assert v_pay = 12000, format('Step 4 payable expected 12000, got %s',    v_pay);

  -- Step 5 — another cash_in 30k → overflow → (0, 27k)
  -- paid_in total = 35k; paid_out = 3k.
  -- raw_rec = 20k - 35k = -15k → 0.
  -- raw_pay = 15k - 3k = 12k. Plus the receivable overflow 15k → 27k.
  insert into public.transactions
    (user_id, contact_id, type, amount, currency, auto_generated)
  values (v_uid, v_contact, 'income', 30000, v_currency, false);

  select net_receivable, net_payable into v_rec, v_pay
    from public.v_contact_balance
   where contact_id = v_contact and currency = v_currency;
  assert v_rec = 0,     format('Step 5 receivable expected 0, got %s',     v_rec);
  assert v_pay = 27000, format('Step 5 payable expected 27000, got %s',    v_pay);

  raise notice 'All R3 §5.5 matrix steps passed for contact %', v_contact;
end $$;

rollback;
