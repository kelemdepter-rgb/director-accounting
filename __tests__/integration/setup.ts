import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration tests target a real Supabase project. The unit-test suite must
 * still run in environments where no such project is configured, so every
 * integration spec wraps its `describe` in `describe.skipIf(!hasTestEnv())`.
 */
export function hasTestEnv(): boolean {
  return !!(process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_ANON_KEY);
}

export function testEnv(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_TEST_URL;
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY must be set to run integration tests.',
    );
  }
  return { url, anonKey };
}

/**
 * One-off client (no session). Mostly useful for sign-up flows that don't
 * need a persisted session — each integration spec gets its own scoped
 * client via `signUpUser`.
 */
export function makeAnonClient(): SupabaseClient {
  const { url, anonKey } = testEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  client: SupabaseClient;
  email: string;
  password: string;
  userId: string;
}

function randomEmail(prefix: string): string {
  // The local Supabase auth setup accepts anything that looks like an email.
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@integration.test`;
}

/**
 * Create a brand-new user, sign them in, and return the authenticated client.
 * The local-Supabase project should have "Confirm email" disabled, otherwise
 * `signUp` returns a session-less user and the follow-up `signIn` will fail
 * — this is the expected developer setup for integration testing.
 */
export async function signUpUser(prefix: string): Promise<TestUser> {
  const { url, anonKey } = testEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = randomEmail(prefix);
  const password = 'IntegrationTest!123';
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  let userId = data.user?.id;
  // If email confirmation is enabled the session is null — fall back to
  // password sign-in (still requires confirmation be off, but at least we
  // surface a clearer error).
  if (!data.session) {
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    userId = signedIn.data.user?.id;
  }
  if (!userId) throw new Error('signUp did not return a user id');
  return { client, email, password, userId };
}

/**
 * Convenience: provision two distinct users for cross-user RLS tests.
 */
export async function signUpTwoUsers(): Promise<{
  a: TestUser;
  b: TestUser;
}> {
  const [a, b] = await Promise.all([signUpUser('user-a'), signUpUser('user-b')]);
  return { a, b };
}
