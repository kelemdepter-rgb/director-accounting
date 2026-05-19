-- =============================================================================
-- 013_contact_service_type.sql
--
-- Add a `service_type` column to `contacts` so the user can tag each contact
-- with what kind of business they do together. Travel-agency directors deal
-- in three flavours of work — visa applications, ticketing, or both — and
-- the UI uses this to render a coloured badge on the contact card.
--
-- Stored as a Postgres enum so the value list stays explicit at the DB
-- boundary and is cheap to filter on.
-- =============================================================================

begin;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'contact_service_type'
  ) then
    create type contact_service_type as enum ('vize', 'bilet', 'bilet_ve_vize');
  end if;
end$$;

alter table public.contacts
  add column if not exists service_type contact_service_type;

create index if not exists contacts_service_type_idx
  on public.contacts (service_type)
  where service_type is not null;

commit;

notify pgrst, 'reload schema';
