const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    files: ['app/**/*.{ts,tsx,js,jsx}', 'src/**/*.{ts,tsx,js,jsx}', '__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.expo/**',
      'web-build/**',
      '.expo-export-check/**',
      '.claude/**',
    ],
  },
]);
