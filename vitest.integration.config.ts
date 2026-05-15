import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Integration-test config. Lives separately from `vitest.config.ts` so the
 * default unit run can `exclude` __tests__/integration entirely without
 * blocking these specs when the user opts in via `npm run test:integration`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/integration/**/*.test.ts'],
    // No exclude — we want this config to run *only* the integration suite.
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
});
