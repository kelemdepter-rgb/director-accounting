-- =============================================================================
-- 004_realtime.sql
-- Add user-owned tables to the supabase_realtime publication so the client can
-- receive Postgres change notifications. RLS policies still apply, so users
-- only see changes to their own rows.
-- Run AFTER the previous three migrations.
-- =============================================================================

begin;

-- The publication is created automatically by Supabase. Add tables that the
-- client subscribes to in `src/hooks/useRealtimeSync.ts`.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.contacts;
    alter publication supabase_realtime add table public.transactions;
    alter publication supabase_realtime add table public.debts;
    alter publication supabase_realtime add table public.debt_payments;
  end if;
exception
  when duplicate_object then
    -- Tables were already in the publication; nothing to do.
    null;
end
$$;

commit;
