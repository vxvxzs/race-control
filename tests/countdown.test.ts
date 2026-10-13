import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countdownParts } from '../src/lib/countdown'

test('countdown uses the UTC instant through the Warsaw DST change', () => {
  assert.deepEqual(countdownParts('2026-10-25T19:00:00Z', Date.parse('2026-10-24T18:58:57Z')), {
    started: false,
    days: 1,
    hours: 0,
    minutes: 1,
    seconds: 3,
  })
})
test('expired, exact-start and invalid dates stop without negative values', () => {
  for (const date of ['2026-10-25T19:00:00Z', '2020-01-01T00:00:00Z', 'invalid'])
    assert.deepEqual(countdownParts(date, Date.parse('2026-10-25T19:00:00Z')), {
      started: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
})
