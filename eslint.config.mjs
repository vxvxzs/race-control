import { FlatCompat } from '@eslint/eslintrc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) })
export default [
  {
    ignores: [
      '.next*/**',
      'work/**',
      'node_modules/**',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@next/next/no-img-element': 'off',
    },
  },
]
