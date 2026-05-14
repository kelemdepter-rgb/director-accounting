import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

/**
 * Root route — redirects to the correct destination based on the current
 * auth state. The actual auth bootstrap happens in `app/_layout.tsx`, so by
 * the time this renders, `status` is no longer `'loading'`.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
