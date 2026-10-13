import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertLocalDemo } from '../scripts/demo-safety'

test('demo tools reject PostgreSQL even without NODE_ENV=production', () => {
  for (const DATABASE_URL of [
    'postgres://example.invalid/demo',
    'postgresql://example.invalid/demo',
  ])
    assert.throws(() => assertLocalDemo({ DATABASE_URL }))
})
test('demo tools reject Vercel and production, including SQLite', () => {
  assert.throws(() => assertLocalDemo({ VERCEL: '1', DATABASE_URL: 'file:./demo.db' }))
  assert.throws(() => assertLocalDemo({ NODE_ENV: 'production', DATABASE_URL: 'file:./demo.db' }))
})
test('local SQLite demo remains supported', () => {
  assert.doesNotThrow(() => assertLocalDemo({ DATABASE_URL: 'file:./work/demo.db' }))
  assert.doesNotThrow(() => assertLocalDemo({}))
})
