import eslint from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  // Ignore patterns for the entire monorepo
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.nx/**',
      '**/.turbo/**',
      '**/build/**',
      '**/out/**',
      '**/*.min.js',
      '**/*.min.mjs',
      '**/eslint.config.ts',
      '**/eslint.config.js',
      '**/eslint.config.mjs',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Main configuration for all TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        global: 'readonly',
        module: 'writable',
        require: 'readonly',
        // ES6+ globals
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Symbol: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json', './packages/*/tsconfig.json', './templates/*/tsconfig.json'],
        },
      },
    },
    rules: {
      // ESLint core rules that need to be disabled for TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',

      // TypeScript ESLint rules
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        {
          accessibility: 'explicit',
          overrides: {
            constructors: 'no-public',
          },
        },
      ],
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: [
            // Index signature
            'signature',
            'call-signature',
            // Fields
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            '#private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            '#private-instance-field',
            'public-abstract-field',
            'protected-abstract-field',
            'public-field',
            'protected-field',
            'private-field',
            '#private-field',
            'static-field',
            'instance-field',
            'abstract-field',
            'field',
            // Static initialization
            'static-initialization',
            // Constructors
            'public-constructor',
            'protected-constructor',
            'private-constructor',
            'constructor',
            // Getters / Setters
            ['public-static-get', 'public-static-set'],
            ['protected-static-get', 'protected-static-set'],
            ['private-static-get', 'private-static-set'],
            ['#private-static-get', '#private-static-set'],
            ['public-instance-get', 'public-instance-set'],
            ['protected-instance-get', 'protected-instance-set'],
            ['private-instance-get', 'private-instance-set'],
            ['#private-instance-get', '#private-instance-set'],
            ['public-abstract-get', 'public-abstract-set'],
            ['protected-abstract-get', 'protected-abstract-set'],
            ['public-get', 'public-set'],
            ['protected-get', 'protected-set'],
            ['private-get', 'private-set'],
            ['#private-get', '#private-set'],
            ['static-get', 'static-set'],
            ['instance-get', 'instance-set'],
            ['abstract-get', 'abstract-set'],
            ['get', 'set'],
            // Methods
            'public-static-method',
            'protected-static-method',
            'private-static-method',
            '#private-static-method',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            '#private-instance-method',
            'public-abstract-method',
            'protected-abstract-method',
            'public-method',
            'protected-method',
            'private-method',
            '#private-method',
            'static-method',
            'instance-method',
            'abstract-method',
            'method',
          ],
        },
      ],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          format: ['strictCamelCase'],
          leadingUnderscore: 'forbid',
          selector: 'default',
          trailingUnderscore: 'forbid',
        },
        {
          format: ['UPPER_CASE', 'PascalCase', 'strictCamelCase'],
          modifiers: ['const'],
          selector: 'variable',
        },
        {
          format: ['strictCamelCase'],
          selector: 'parameter',
        },
        {
          format: ['UPPER_CASE', 'PascalCase', 'strictCamelCase'],
          selector: 'objectLiteralProperty',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'typeLike',
        },
      ],

      // General rules
      curly: ['warn', 'all'],
      'object-shorthand': 'warn',

      // Import plugin rules
      'import/named': 'off',
      'import/newline-after-import': 'warn',
      'import/order': [
        'warn',
        {
          alphabetize: {
            caseInsensitive: true,
            order: 'asc',
            orderImportKind: 'asc',
          },
          distinctGroup: true,
          groups: ['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          pathGroups: [
            {
              group: 'external',
              pattern: '@seonggukchoi{,*,*/**}',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: [],
        },
      ],

      // Prettier plugin rule
      'prettier/prettier': 'warn',

      // Unused imports plugin rule
      'unused-imports/no-unused-imports': 'warn',
    },
  },

  // Configuration for jest.config files
  {
    files: ['**/jest.config.ts', '**/jest.config.js'],
    rules: {
      '@typescript-eslint/naming-convention': 'off', // Jest config uses regex patterns as keys
    },
  },

  // Jest configuration for test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },

  // Prettier config compatibility (should be last)
  eslintConfigPrettier,
];

export default config;
