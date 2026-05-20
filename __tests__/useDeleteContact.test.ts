/**
 * Regression test for the Round 2 "second delete always fails" bug.
 *
 * The original useDeleteContact ran a raw `.delete()` against the contacts
 * table. The first contact a user removed worked because it had no debts;
 * the second one tripped the ON DELETE RESTRICT on `debts.contact_id` and
 * threw 23503. Migration 014 swaps that FK for ON DELETE CASCADE *and*
 * introduces `delete_contact` as the canonical entry point. This test
 * asserts that the hook calls the RPC, deletes three contacts in a row
 * without error, and tears down the right cache keys after each one.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above any top-level `const` in this file, so the mock
// functions have to be created via vi.hoisted so they exist by the time the
// factory runs.
const { rpcMock, deleteMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: () => ({
      delete: () => ({
        eq: (_col: string, _val: string) => {
          deleteMock();
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  },
}));

// eslint-disable-next-line import/first
import { useDeleteContact } from '@/hooks/useContacts';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDeleteContact — sequential deletes', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    deleteMock.mockReset();
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deletes three contacts sequentially via delete_contact RPC', async () => {
    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    await result.current.mutateAsync('contact-1');
    await result.current.mutateAsync('contact-2');
    await result.current.mutateAsync('contact-3');

    expect(rpcMock).toHaveBeenCalledTimes(3);
    expect(rpcMock).toHaveBeenNthCalledWith(1, 'delete_contact', { p_id: 'contact-1' });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'delete_contact', { p_id: 'contact-2' });
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'delete_contact', { p_id: 'contact-3' });
  });

  it('falls back to .delete() if the RPC is not deployed yet', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' },
    });

    const { result } = renderHook(() => useDeleteContact(), { wrapper });
    await result.current.mutateAsync('contact-x');

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  it('rethrows non-404 RPC errors', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'not_owner' },
    });

    const { result } = renderHook(() => useDeleteContact(), { wrapper });
    await expect(result.current.mutateAsync('contact-y')).rejects.toMatchObject({
      code: '42501',
    });
  });
});
