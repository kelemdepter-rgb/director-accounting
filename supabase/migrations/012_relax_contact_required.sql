-- =============================================================================
-- 012_relax_contact_required.sql
--
-- Only `phone` should be mandatory on the "Yeni Kişi" form. Loosen the
-- contacts table so `full_name` is nullable (but still bounded 1..200 when
-- supplied), and require `phone_number` (3..30) when set. Add a partial
-- unique index on (user_id, phone_number) to keep accidental duplicates out
-- without blocking rows where the user genuinely doesn't want to record a
-- phone number.
--
-- Display fallback is handled client-side: name?.trim() || phone.
-- =============================================================================

begin;

-- Drop the old "name length between 1 and 200" check; it implicitly
-- required a value.
alter table public.contacts
  alter column full_name drop not null;

-- Re-establish the bounded-length check but tolerate NULL.
alter table public.contacts
  drop constraint if exists contacts_full_name_check;

-- Existing column constraints in 001 weren't named, so Postgres assigned
-- auto names like `contacts_full_name_check`. Use a fresh, explicit name.
alter table public.contacts
  add constraint contacts_full_name_length_ck
  check (full_name is null or length(full_name) between 1 and 200);

-- Index unique phone numbers per-user so two contacts can't share one
-- digit-for-digit. Partial so the NULLs (no phone recorded) don't trip it.
create unique index if not exists contacts_user_phone_uniq
  on public.contacts (user_id, phone_number)
  where phone_number is not null;

commit;

notify pgrst, 'reload schema';
