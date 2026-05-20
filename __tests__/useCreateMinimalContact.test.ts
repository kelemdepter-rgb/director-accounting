/**
 * Regression test for Round 3 §3 — the silent "+ Ekle" failure.
 *
 * The old onPickCreate ran a raw `.insert()` inside `try { ... } catch {}`.
 * If the insert failed (RLS, partial-unique conflict on phone, etc.) the
 * UI showed nothing and the user reported "the new contact doesn't get
 * added." This hook now routes through the create_contact_minimal RPC
 * (migration 015) which is idempotent on duplicate phone, and falls
 * back to a raw insert only if the RPC is not deployed.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, insertMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => ({
      single: () => rpcMock(...args),
    }),
    from: () => ({
      insert: (payload: unknown) => ({
        select: () => ({
          single: () => insertMock(payload),
        }),
      }),
    }),
  },
}));

// eslint-disable-next-line import/first
import { useCreateMinimalContact } from '@/hooks/useContacts';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCreateMinimalContact', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    insertMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls the RPC with phone + name and returns the new row', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { id: 'c1', full_name: 'Alice', phone_number: '5551234567' },
      error: null,
    });

    const { result } = renderHook(() => useCreateMinimalContact(), { wrapper });
    const row = await result.current.mutateAsync({
      phone: '5551234567',
      name: 'Alice',
      userId: 'u1',
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('create_contact_minimal', {
      p_phone: '5551234567',
      p_name: 'Alice',
    });
    expect(row.id).toBe('c1');
  });

  it('falls back to insert if the RPC is not deployed yet (PGRST202)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' },
    });
    insertMock.mockResolvedValueOnce({
      data: { id: 'c2', full_name: null, phone_number: '5551234567' },
      error: null,
    });

    const { result } = renderHook(() => useCreateMinimalContact(), { wrapper });
    const row = await result.current.mutateAsync({
      phone: '5551234567',
      name: null,
      userId: 'u1',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(row.id).toBe('c2');
  });

  it('rethrows non-404 RPC errors so the UI can surface them', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'rls' },
    });

    const { result } = renderHook(() => useCreateMinimalContact(), { wrapper });
    await expect(
      result.current.mutateAsync({ phone: '555', name: null, userId: 'u1' }),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
