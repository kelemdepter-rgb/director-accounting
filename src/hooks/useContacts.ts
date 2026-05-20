import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ContactInsert, ContactRow, ContactUpdate } from '@/types/database';

const CONTACTS_KEY = ['contacts'] as const;
const DEBTS_KEY = ['debts'] as const;
const TRANSACTIONS_KEY = ['transactions'] as const;
const SUMMARY_KEY = ['summary'] as const;

export interface UseContactsOptions {
  /** Free-text filter applied server-side via ILIKE on full_name. */
  search?: string;
  /** Disable fetching (e.g. user is logged out). */
  enabled?: boolean;
}

export function useContacts({ search, enabled = true }: UseContactsOptions = {}) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, { search: search?.trim() ?? '' }] as const,
    enabled,
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('full_name', { ascending: true });

      const trimmed = search?.trim();
      if (trimmed && trimmed.length > 0) {
        // ilike pattern; escape % and _ so user input isn't a wildcard.
        const safe = trimmed.replace(/[%_]/g, (m) => `\\${m}`);
        query = query.ilike('full_name', `%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, 'detail', id] as const,
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Missing id');
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ContactRow;
    },
  });
}

interface CreateArgs extends ContactInsert {
  user_id: string;
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateArgs) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ContactRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Minimal "create from autocomplete fallback" path: phone (required-ish)
 * and an optional name. Calls migration 015's `create_contact_minimal`
 * RPC which is idempotent on duplicate phone — if the user types a phone
 * that's already on file, they get back the existing contact and the
 * autocomplete selects it rather than throwing 23505. Falls back to the
 * raw insert if the RPC isn't deployed yet (PGRST202).
 */
export function useCreateMinimalContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { phone: string | null; name: string | null; userId: string },
    ) => {
      const { data, error } = await supabase
        .rpc('create_contact_minimal', {
          p_phone: input.phone,
          p_name: input.name,
        })
        .single();
      if (error) {
        // Backwards compat: until 015 is applied, fall through to .insert()
        // so the UX keeps working. Once 015 lands, this branch never fires.
        if (error.code === 'PGRST202' || error.code === '404') {
          const { data: row, error: insertErr } = await supabase
            .from('contacts')
            .insert({
              user_id: input.userId,
              phone_number: input.phone,
              full_name: input.name,
            })
            .select()
            .single();
          if (insertErr) throw insertErr;
          return row as ContactRow;
        }
        throw error;
      }
      return data as ContactRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContactUpdate }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ContactRow;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      qc.setQueryData([...CONTACTS_KEY, 'detail', row.id], row);
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    // `id` is passed explicitly to the mutation function and threaded
    // through onSuccess via the second argument so the post-mutation
    // cleanup can never reference a stale closure variable.
    mutationFn: async (id: string) => {
      // Migration 014 introduced `public.delete_contact(p_id uuid)` which
      // wraps the delete in a transaction, verifies ownership, and removes
      // every child row before the contact itself. We RPC into that
      // function instead of issuing a raw `.delete()` so the FK-cascade
      // path is the same across schema versions.
      const { error: rpcError } = await supabase.rpc('delete_contact', { p_id: id });
      if (rpcError) {
        // If the function isn't deployed yet (e.g. 014 hasn't been applied),
        // PostgREST returns `PGRST202` — fall back to the raw delete so the
        // app keeps working until the migration lands.
        if (rpcError.code === 'PGRST202' || rpcError.code === '404') {
          const { error: fallbackError } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);
          if (fallbackError) throw fallbackError;
        } else {
          throw rpcError;
        }
      }
      return id;
    },
    onSuccess: (_data, id) => {
      // Drop the detail entry outright — invalidating would leave it
      // hanging with `isError: true` from the next refetch.
      qc.removeQueries({ queryKey: [...CONTACTS_KEY, 'detail', id] });
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      // The RPC also deletes the contact's debts + transactions, so any
      // open list that's filtered by contact_id needs to refresh too.
      void qc.invalidateQueries({ queryKey: DEBTS_KEY });
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    },
  });
}
