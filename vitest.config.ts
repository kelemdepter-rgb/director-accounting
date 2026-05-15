import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app source uses the automatic JSX runtime (Expo's tsconfig sets
  // `"jsx": "react-jsx"`), so esbuild must too — otherwise components fail
  // at runtime with "React is not defined".
  esbuild: { jsx: 'automatic' },
  test: {
    // jsdom is needed by react-native-web (we alias react-native to it for
    // component tests — its DOM renderer pokes at window/document).
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    // Integration specs are run separately via `npm run test:integration`,
    // because they require live Supabase credentials.
    exclude: ['__tests__/integration/**', 'node_modules/**'],
    server: {
      deps: {
        // Force Vite to pre-bundle these deps so its `react-native` →
        // `react-native-web` alias actually applies to their internal
        // imports. Without this they resolve the real (Flow-typed) RN
        // entry point and crash on `import typeof`.
        inline: [
          /@testing-library\/react-native/,
          /react-test-renderer/,
          /react-native/,
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.ts'],
    },
  },
  resolve: {
    alias: [
      // React Native ships Flow-typed source files that esbuild can't parse.
      // For unit + component tests we route every `react-native` import to
      // `react-native-web`, which is plain ES that Vitest can handle. The
      // exact `^react-native$` match avoids hijacking unrelated packages
      // like `react-native-web` itself.
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
});
