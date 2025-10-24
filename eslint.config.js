import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import perfectionist from 'eslint-plugin-perfectionist'

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: { '@typescript-eslint': tseslint, perfectionist },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'perfectionist/sort-objects': ['error', { type: 'natural', order: 'asc', partitionByComment: false }],
      'perfectionist/sort-interfaces': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-object-types': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-union-types': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          newlinesBetween: 'never'
        }
      ],
      'perfectionist/sort-named-imports': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-named-exports': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-exports': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-enums': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-array-includes': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-classes': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-intersection-types': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-maps': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-sets': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-switch-case': ['error', { type: 'natural', order: 'asc' }],
      'perfectionist/sort-variable-declarations': ['error', { type: 'natural', order: 'asc' }]
    }
  },
  {
    files: ['schemas/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' }
    },
    plugins: { '@typescript-eslint': tseslint, perfectionist },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      'perfectionist/sort-objects': ['error', { type: 'natural', order: 'asc', partitionByComment: false }]
    }
  },
  { ignores: ['node_modules/**', '*.js'] }
]
