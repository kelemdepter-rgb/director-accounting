-- =============================================================================
-- 005_strengthen_rls.sql
-- Closes the cross-user hole on `debt_payments`. The 002 policies only
-- verified that the inserted/updated row's `user_id` matched `auth.uid()`,
-- which still let Bob attach a payment to Alice's `debt_id` as long as he
-- stamped his own user_id on it. Joining through `debts` plugs that.
--
-- record_debt_payment (006) does the same check inside the RPC, but we keep
-- this defence-in-depth so any future direct table mutation is also safe.
-- =============================================================================

begin;

drop policy if exists "debt_payments_insert_own" on public.debt_payments;
create policy "debt_payments_insert_own" on public.debt_payments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.debts d
       where d.id = debt_payments.debt_id
         and d.user_id = auth.uid()
    )
  );

drop policy if exists "debt_payments_update_own" on public.debt_payments;
create policy "debt_payments_update_own" on public.debt_payments
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.debts d
       where d.id = debt_payments.debt_id
         and d.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.debts d
       where d.id = debt_payments.debt_id
         and d.user_id = auth.uid()
    )
  );

drop policy if exists "debt_payments_delete_own" on public.debt_payments;
create policy "debt_payments_delete_own" on public.debt_payments
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.debts d
       where d.id = debt_payments.debt_id
         and d.user_id = auth.uid()
    )
  );

commit;
