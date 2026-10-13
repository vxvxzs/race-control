import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateChampionshipStandings,
  calculateEntryPoints,
  type RaceWithResult,
} from '../src/lib/standings'
import { formatRaceTime } from '../src/lib/dates'
import { hashToken, tokenValid } from '../src/lib/verification'
import { renderEmail } from '../src/lib/notifications'
const race = (id: string, round: number, position: number, overrides = {}): RaceWithResult => ({
  raceId: id,
  raceName: id,
  round,
  track: id,
  date: '2026-10-25T19:00:00Z',
  status: 'published',
  entries: [
    {
      driverId: 'one',
      driverName: 'Żaneta Łuczak',
      position,
      finishStatus: 'finished',
      ...overrides,
    },
  ],
})
test('two races with round 1 retain distinct cells and the correct total and wins', () => {
  const [d] = calculateChampionshipStandings([race('spa', 1, 1), race('lemans', 1, 2)])
  assert.equal(d.totalPoints, 43)
  assert.equal(d.wins, 1)
  assert.equal(d.starts, 2)
  assert.deepEqual(d.racePoints.spa, { points: 25, position: 1, status: 'finished' })
  assert.deepEqual(d.racePoints.lemans, { points: 18, position: 2, status: 'finished' })
})
test('classified DNF scores position less penalties; unclassified and DSQ score zero', () => {
  assert.equal(calculateEntryPoints(2, 'dnf', 3, true), 15)
  assert.equal(calculateEntryPoints(2, 'dnf', 0, false), 0)
  assert.equal(calculateEntryPoints(1, 'dsq', 0, true), 0)
  assert.equal(calculateEntryPoints(11, 'finished'), 0)
  assert.equal(calculateEntryPoints(2, 'finished', 100), 0)
})
test('classification decision changes points and countback; drafts excluded', () => {
  const first = race('spa', 1, 1, { finishStatus: 'dnf' })
  const draft = { ...race('draft', 2, 1), status: 'draft' as const }
  assert.equal(calculateChampionshipStandings([first, draft])[0].totalPoints, 25)
  assert.equal(calculateChampionshipStandings([first])[0].wins, 1)
  first.entries[0].classified = false
  assert.equal(calculateChampionshipStandings([first])[0].totalPoints, 0)
  assert.equal(calculateChampionshipStandings([first])[0].wins, 0)
})
test('Warsaw DST: 25 October 2026 at 20:00 is CET, summer is CEST', () => {
  assert.equal(formatRaceTime('2026-10-25T19:00:00Z'), '20:00 CET')
  assert.equal(formatRaceTime('2026-10-24T18:00:00Z'), '20:00 CEST')
  assert.equal(formatRaceTime('2026-03-29T18:00:00Z'), '20:00 CEST')
})
test('verification rejects expired, invalid and consumed tokens', () => {
  const token = 'a'.repeat(64),
    hash = hashToken(token)
  assert.equal(tokenValid(hash, new Date(Date.now() + 1000).toISOString(), token), true)
  assert.equal(tokenValid(hash, '2020-01-01T00:00:00Z', token), false)
  assert.equal(tokenValid(hash, new Date(Date.now() + 1000).toISOString(), 'wrong'), false)
  assert.equal(tokenValid(null, null, token), false)
})
test('email escapes user content and links', () => {
  const html = renderEmail(
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'https://example.com/?a="b',
  )
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&quot;'))
})
test('countback covers positions beyond 24 and equal names use a stable ID', () => {
  const a = race('wide-grid', 1, 25),
    b = race('other', 2, 26)
  b.entries[0].driverId = 'two'
  b.entries[0].driverName = 'Aleksandra'
  assert.equal(calculateChampionshipStandings([b, a])[0].driverId, 'one')
  a.entries[0].driverName = 'Same'
  b.entries[0].driverName = 'Same'
  b.entries[0].position = 25
  assert.deepEqual(
    calculateChampionshipStandings([b, a]).map((d) => d.driverId),
    ['one', 'two'],
  )
})
