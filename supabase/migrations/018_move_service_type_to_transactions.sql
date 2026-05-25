-- =============================================================================
-- 018_move_service_type_to_transactions.sql
--
-- Round 5 §1 — relocate `service_type` from `contacts` onto `debts` and
-- `transactions`. A single client can have a visa transaction one month and a
-- flight-ticket transaction the next; tagging the contact tied the user's
-- hands. The pills now live on the entry form for each transaction.
--
-- This migration:
--   1. Adds `service_type` (existing enum `public.contact_service_type`) and
--      `service_type_other` (text) to both `debts` and `transactions`, with a
--      XOR CHECK mirroring the constraint on `contacts` from 016.
--   2. Backfills both tables from each row's owning contact, so history that
--      pre-dated this migration still shows a badge.
--   3. Drops the columns and constraint from `contacts`. Order matters —
--      backfill first, drop second.
--   4. Adds covering indexes used by the home-list query introduced in §2.
--
-- Verify after applying:
--   select count(*) from public.debts where service_type is not null;
--   select count(*) from public.transactions where service_type is not null;
--   select 1 from information_schema.columns
--     where table_schema='public' and table_name='contacts'
--       and column_name='service_type';   -- must return zero rows
-- =============================================================================

begin;

-- 1) Add columns to debts.
alter table public.debts
  add column if not exists service_type       public.contact_service_type,
  add column if not exists service_type_other text
    check (
      service_type_other is null
      or length(btrim(service_type_other)) between 1 and 200
    );

alter table public.debts
  drop constraint if exists debts_service_type_other_xor;
alter table public.debts
  add constraint debts_service_type_other_xor check (
       (service_type =  'other' and service_type_other is not null
          and length(btrim(service_type_other)) >= 1)
    or (service_type is distinct from 'other' and service_type_other is null)
  );

-- 2) Add columns to transactions.
alter table public.transactions
  add column if not exists service_type       public.contact_service_type,
  add column if not exists service_type_other text
    check (
      service_type_other is null
      or length(btrim(service_type_other)) between 1 and 200
    );

alter table public.transactions
  drop constraint if exists transactions_service_type_other_xor;
alter table public.transactions
  add constraint transactions_service_type_other_xor check (
       (service_type =  'other' and service_type_other is not null
          and length(btrim(service_type_other)) >= 1)
    or (service_type is distinct from 'other' and service_type_other is null)
  );

-- 3) Backfill from contacts. One transaction; rolls back if any row fails.
update public.debts d
   set service_type       = c.service_type,
       service_type_other = c.service_type_other
  from public.contacts c
 where d.contact_id = c.id
   and d.service_type is null
   and c.service_type is not null;

update public.transactions t
   set service_type       = c.service_type,
       service_type_other = c.service_type_other
  from public.contacts c
 where t.contact_id = c.id
   and t.service_type is null
   and c.service_type is not null;

-- 4) Drop from contacts. Constraint first, then columns. The index from 013
--    is implicitly dropped with the column.
alter table public.contacts
  drop constraint if exists contacts_service_type_other_xor;

alter table public.contacts
  drop column if exists service_type_other,
  drop column if exists service_type;

-- 5) Covering indexes for the home-list query (§2). Partial indexes keep
--    the index small when most rows have no service_type.
create index if not exists debts_service_type_idx
  on public.debts (service_type)
  where service_type is not null;

create index if not exists transactions_service_type_idx
  on public.transactions (service_type)
  where service_type is not null;

commit;

notify pgrst, 'reload schema';
