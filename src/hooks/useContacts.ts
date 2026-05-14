import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ContactInsert, ContactRow, ContactUpdate } from '@/types/database';

const CONTACTS_KEY = ['contacts'] as const;

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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}
