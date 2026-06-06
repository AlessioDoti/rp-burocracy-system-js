import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.jest }
    },
    rules: {
      // Class/Type names (capital first letter) are often imported only so they
      // can be referenced inside JSDoc — allow those to be unused.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^[A-Z]',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'multi-line'],
      'prefer-const': 'error'
    }
  },
  {
    files: ['tests/**/*.test.js', 'tests/**/*.js'],
    rules: { 'no-console': 'off' }
  },
  {
    ignores: ['node_modules/', 'coverage/', 'dist/']
  }
];
