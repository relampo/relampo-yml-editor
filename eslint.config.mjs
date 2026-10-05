import js from '@eslint/js';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import gdp from '@gdp-ts/core/lint/eslint';

export default tseslint.config(
  {
    ignores: ['build/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'max-lines': [
        'warn',
        {
          max: 900,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'preserve-caught-error': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'max-lines': [
        'warn',
        {
          max: 900,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'preserve-caught-error': 'off',
    },
  },
  {
    files: ['src/proofs/**/*.ts'],
    rules: {
      // gdp-ts uses one named interface per proof to keep proof inference distinct.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },
  ...gdp({ files: ['src/**/*.{ts,tsx}'] }),
  ...gdp({ strict: true, files: ['src/utils/dataSourceUpload.mistakes.ts'] }),
);
