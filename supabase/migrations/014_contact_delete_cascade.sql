-- =============================================================================
-- 014_contact_delete_cascade.sql
--
-- Round 2 — contact delete fails on the second attempt.
--
-- Root cause: `debts.contact_id` was created in 001_initial_schema.sql with
-- `ON DELETE RESTRICT`. The very first contact a fresh user deletes is the
-- one they just created (no debts yet) — that succeeds. The next contact in
-- the list usually has at least one debt referencing it, and the raw
-- `delete from contacts where id = $1` from useDeleteContact then throws
-- with `23503 foreign key constraint`. From the frontend it looked like
-- "the second delete always fails", which is exactly the reported symptom.
--
-- Fix:
--   1. Swap the FK from `restrict` to `cascade` on both debts.contact_id and
--      transactions.contact_id so removing a contact cleans up everything
--      that references it. debt_payments already cascades from debts, so
--      we get the full subtree for free.
--   2. Add a `delete_contact(p_id uuid)` RPC that wraps the operation in a
--      single transaction, verifies `auth.uid()` owns the contact, and is
--      `security definer` so RLS doesn't block the cleanup of children.
-- =============================================================================

begin;

-- 1. Re-create FKs with on delete cascade.
alter table public.debts
  drop constraint if exists debts_contact_id_fkey;
alter table public.debts
  add constraint debts_contact_id_fkey
    foreign key (contact_id) references public.contacts(id) on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_contact_id_fkey;
alter table public.transactions
  add constraint transactions_contact_id_fkey
    foreign key (contact_id) references public.contacts(id) on delete cascade;

-- 2. delete_contact RPC.
--
-- The function explicitly deletes children (transactions, debts) before the
-- contact row. With the cascades above this is belt-and-braces, but it also
-- means the function works the same way against either schema state —
-- handy while older clients are still in flight against a partially-migrated
-- database.
create or replace function public.delete_contact(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select user_id into v_owner from public.contacts where id = p_id;
  if v_owner is null then
    -- Contact already gone — treat as a no-op so retries are idempotent.
    return;
  end if;
  if v_owner <> v_uid then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  delete from public.debt_payments
    where debt_id in (select id from public.debts where contact_id = p_id);
  delete from public.debts where contact_id = p_id;
  delete from public.transactions where contact_id = p_id;
  delete from public.contacts where id = p_id and user_id = v_uid;
end;
$$;

revoke all on function public.delete_contact(uuid) from public;
grant execute on function public.delete_contact(uuid) to authenticated;

-- Tell PostgREST to refresh its function cache so the new signature is
-- callable immediately after deploy.
notify pgrst, 'reload schema';

commit;
