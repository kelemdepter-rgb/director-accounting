import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContactsPermission,
  type PhoneContact,
  fetchPhoneContacts,
  filterPhoneContacts,
  getPhoneContactsPermissionStatus,
  isPhoneContactsSupported,
  requestPhoneContactsPermission,
} from '@/lib/contacts';

interface State {
  permission: ContactsPermission;
  contacts: PhoneContact[];
  loading: boolean;
  error: unknown;
}

const INITIAL_STATE: State = {
  permission: isPhoneContactsSupported() ? 'undetermined' : 'unsupported',
  contacts: [],
  loading: false,
  error: null,
};

export function usePhoneContacts() {
  const [state, setState] = useState<State>(INITIAL_STATE);

  const refreshPermission = useCallback(async () => {
    if (!isPhoneContactsSupported()) {
      setState((s) => ({ ...s, permission: 'unsupported' }));
      return 'unsupported' as ContactsPermission;
    }
    const status = await getPhoneContactsPermissionStatus();
    setState((s) => ({ ...s, permission: status }));
    return status;
  }, []);

  const load = useCallback(async () => {
    if (!isPhoneContactsSupported()) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const list = await fetchPhoneContacts();
      setState((s) => ({ ...s, contacts: list, loading: false }));
    } catch (err) {
      setState((s) => ({ ...s, error: err, loading: false }));
    }
  }, []);

  const request = useCallback(async (): Promise<ContactsPermission> => {
    if (!isPhoneContactsSupported()) return 'unsupported';
    const status = await requestPhoneContactsPermission();
    setState((s) => ({ ...s, permission: status }));
    if (status === 'granted') {
      await load();
    }
    return status;
  }, [load]);

  // Probe permission once on mount (does not trigger the OS prompt).
  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  // Auto-load when permission flips to granted.
  useEffect(() => {
    if (state.permission === 'granted' && state.contacts.length === 0 && !state.loading) {
      void load();
    }
  }, [state.permission, state.contacts.length, state.loading, load]);

  const search = useCallback(
    (query: string, limit?: number) => filterPhoneContacts(state.contacts, query, limit),
    [state.contacts],
  );

  return useMemo(
    () => ({
      permission: state.permission,
      contacts: state.contacts,
      loading: state.loading,
      error: state.error,
      supported: isPhoneContactsSupported(),
      request,
      refresh: load,
      search,
    }),
    [state, request, load, search],
  );
}
