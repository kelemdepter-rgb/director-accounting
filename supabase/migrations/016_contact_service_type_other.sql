-- =============================================================================
-- 016_contact_service_type_other.sql
--
-- Round 3 §4 — adds an "other" pill to the contact service-type picker
-- with a free-text description field. Many clients buy services that
-- aren't visa/ticket (hotel bookings, translation, currency exchange);
-- forcing them into the three fixed values lost information.
--
-- This migration:
--   1. Adds `other` to the `contact_service_type` enum.
--   2. Adds `service_type_other text` to `contacts` with a length check.
--   3. Adds a XOR-style CHECK constraint that mirrors the Zod refinement
--      on the client: `service_type_other` is required when, and only
--      when, `service_type = 'other'`.
-- =============================================================================

begin;

-- ALTER TYPE ADD VALUE cannot run inside a transaction block in older
-- Postgres builds, but Supabase ships PG 15+ where `if not exists` IS
-- supported inside a transaction. Keep it inside the begin/commit since
-- the rest of the migration depends on it.
alter type public.contact_service_type add value if not exists 'other';

alter table public.contacts
  add column if not exists service_type_other text
  check (
    service_type_other is null
    or length(btrim(service_type_other)) between 1 and 200
  );

alter table public.contacts
  drop constraint if exists contacts_service_type_other_xor;

alter table public.contacts
  add constraint contacts_service_type_other_xor
  check (
    (service_type = 'other' and service_type_other is not null
       and length(btrim(service_type_other)) >= 1)
    or (service_type is distinct from 'other' and service_type_other is null)
  );

commit;

notify pgrst, 'reload schema';
