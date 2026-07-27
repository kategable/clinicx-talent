import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';

export default [
  // Global ignores
  {
    ignores: [
      '.angular/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'lighthouse-report*.html',
    ],
  },
  // Base configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // All TypeScript files
  {
    files: ['src/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': ['warn'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Angular template files
  {
    files: ['src/**/*.html'],
    plugins: { 'angular-template': angularTemplate },
    languageOptions: {
      parser: templateParser,
    },
    rules: {
      'angular-template/no-negated-async': ['error'],
      'angular-template/eqeqeq': ['error'],
      'angular-template/no-autofocus': ['off'],
      'angular-template/alt-text': ['warn'],
      'angular-template/click-events-have-key-events': ['warn'],
    },
  },
  // E2E and spec files (relaxed rules)
  {
    files: ['e2e/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': ['off'],
    },
  },
];
