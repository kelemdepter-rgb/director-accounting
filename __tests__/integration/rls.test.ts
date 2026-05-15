import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasTestEnv, signUpTwoUsers, type TestUser } from './setup';

/**
 * Cross-user Row-Level-Security guarantees on debts and debt_payments.
 *
 * The suite skips automatically when SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY
 * are not set so the regular `npm test` run does not fail in CI environments
 * without a live database.
 *
 * NOTE on the first assertion: with the existing 002 RLS policies, an attacker
 * can only insert into `debt_payments` rows whose `user_id` matches their own
 * `auth.uid()`. The interesting attack is "insert with my own user_id but
 * point `debt_id` at someone else's debt". This still requires an additional
 * policy that joins through `debts` — without it the row is created, the
 * `record_debt_payment` RPC is the only safe write path, and this test will
 * surface the gap loudly. Treat a failure here as "the schema's defence
 * needs strengthening", not as a test bug.
 */
describe.skipIf(!hasTestEnv())('RLS — cross-user isolation', () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceDebtId: string;

  beforeAll(async () => {
    const pair = await signUpTwoUsers();
    alice = pair.a;
    bob = pair.b;

    // Alice creates a contact and a debt.
    const contact = await alice.client
      .from('contacts')
      .insert({ user_id: alice.userId, full_name: 'Counterparty A' })
      .select()
      .single();
    expect(contact.error).toBeNull();

    const debt = await alice.client
      .from('debts')
      .insert({
        user_id: alice.userId,
        contact_id: contact.data!.id,
        type: 'receivable',
        principal_amount: 500,
        currency: 'USD',
      })
      .select()
      .single();
    expect(debt.error).toBeNull();
    aliceDebtId = debt.data!.id;
  });

  afterAll(async () => {
    // Best-effort sign-out so the test process does not leave dangling auth
    // listeners in the Supabase JS client.
    await Promise.allSettled([
      alice?.client.auth.signOut(),
      bob?.client.auth.signOut(),
    ]);
  });

  it("Bob cannot insert a debt_payment pointing at Alice's debt", async () => {
    const { error } = await bob.client
      .from('debt_payments')
      .insert({
        debt_id: aliceDebtId,
        user_id: bob.userId,
        amount: 50,
      })
      .select();
    // Either RLS blocks the insert outright (preferred) or the parent-debt
    // FK lookup fails because Alice's debt is invisible to Bob. Both count
    // as "Bob cannot poison Alice's books".
    expect(error).not.toBeNull();
  });

  it("Bob cannot SELECT Alice's debts", async () => {
    const { data, error } = await bob.client.from('debts').select('*').eq('id', aliceDebtId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("Bob cannot call record_debt_payment on Alice's debt", async () => {
    const { error } = await bob.client.rpc('record_debt_payment', {
      p_debt_id: aliceDebtId,
      p_amount: 25,
    });
    expect(error).not.toBeNull();
    // record_debt_payment raises SQLSTATE 42501 for ownership violations.
    expect(error?.code).toBe('42501');
  });
});
