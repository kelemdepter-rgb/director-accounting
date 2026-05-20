-- =============================================================================
-- 015_create_contact_minimal.sql
--
-- Round 3 §3 — the "+ Ekle" fallback in ContactAutocomplete used a raw
-- `.insert()` with bare `catch {}` around it. RLS / duplicate-phone / FK
-- errors were swallowed in the UI, so the user reported "the new contact
-- doesn't get added" even when the insert had actually failed.
--
-- This migration adds a single entry-point RPC for the AddContactSheet:
--   - SECURITY DEFINER so we don't depend on the caller's RLS bypass.
--   - Verifies auth.uid().
--   - Trims input; treats empty strings as null.
--   - On 23505 (unique_violation against the partial unique index
--     contacts_user_phone_uniq from migration 012), returns the existing
--     row instead of throwing. The "+ Ekle" UX should be idempotent —
--     re-tapping it on a phone that already maps to a contact should
--     select that contact, not error.
-- =============================================================================

begin;

create or replace function public.create_contact_minimal(
  p_phone text,
  p_name text default null
)
returns public.contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text := nullif(btrim(p_phone), '');
  v_name text := nullif(btrim(p_name), '');
  v_row public.contacts;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_phone is null and v_name is null then
    -- Migration 012 allows phone to be null, but at least one of the two
    -- identifying fields must be present or we'd create unselectable junk.
    raise exception 'phone_or_name_required' using errcode = '22023';
  end if;

  begin
    insert into public.contacts (user_id, phone_number, full_name)
    values (v_uid, v_phone, v_name)
    returning * into v_row;
  exception
    when unique_violation then
      -- contacts_user_phone_uniq is partial on (user_id, phone_number)
      -- where phone_number is not null. Fetch the conflicting row so
      -- the client can select it and the user sees no scary error.
      select * into v_row
        from public.contacts
        where user_id = v_uid
          and phone_number = v_phone
        limit 1;
      if v_row.id is null then
        -- Conflict on a different constraint; rethrow.
        raise;
      end if;
  end;

  return v_row;
end;
$$;

revoke all on function public.create_contact_minimal(text, text) from public;
grant execute on function public.create_contact_minimal(text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
