import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertDemoAccountsOnly } from '../scripts/demo-safety'
import { demoCollections } from '../scripts/demo-export'

const root = process.cwd()
const sandbox = resolve('work/demo-tools-test')
await mkdir(resolve(sandbox, 'work'), { recursive: true })
process.env.DATABASE_URL = `file:${resolve(sandbox, `test-${randomBytes(8).toString('hex')}.db`)}`
process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
process.env.PAYLOAD_DB_PUSH = 'true'
process.env.MAIL_MODE = 'preview'
const { getPayloadClient } = await import('../src/lib/payload')
const payload = await getPayloadClient()
const run = () =>
  spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(resolve(root, 'node_modules/tsx/dist/loader.mjs')).href,
      resolve(root, 'scripts/restore-demo.ts'),
      '--restore-demo-sports',
    ],
    {
      cwd: sandbox,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json'),
        PAYLOAD_DB_PUSH: 'false',
      },
      encoding: 'utf8',
      timeout: 60000,
    },
  )
try {
  const user = await payload.create({
    collection: 'users',
    data: {
      email: 'demo-tools@example.test',
      name: 'Demo Tools',
      password: randomBytes(24).toString('hex'),
      demoAccount: true,
      emailVerified: true,
      role: 'driver',
    },
  })
  payload.db.allowIDOnCreate = true
  const race = await payload.create({
    collection: 'races',
    context: { skipEvents: true },
    data: {
      id: 40,
      name: 'Restore fixture',
      slug: 'restore-fixture',
      round: 1,
      season: '2026/2027',
      track: 'Monza',
      date: '2026-11-01T19:00:00Z',
      game: 'ACC',
      brief: 'Isolated test',
      maxParticipants: 2,
      isPublished: true,
      registrationStatus: 'open',
      raceStatus: 'upcoming',
    },
  })
  await payload.create({
    collection: 'registrations',
    context: { skipEvents: true },
    data: {
      user: user.id,
      race: race.id,
      status: 'accepted',
      racingNumber: 1,
      carModel: 'GT3',
      registeredAt: new Date().toISOString(),
    },
  })
  const snapshot: Record<string, unknown[]> = {}
  for (const collection of demoCollections)
    snapshot[collection] = (await payload.find({ collection, depth: 0, pagination: false })).docs
  await writeFile(resolve(sandbox, 'work/demo-export.json'), JSON.stringify(snapshot))
  let result = run()
  assert.equal(result.status, 0, result.stderr)
  assert.equal((await payload.findByID({ collection: 'races', id: 40 })).slug, 'restore-fixture')
  const entry = (await payload.find({ collection: 'registrations', depth: 0 })).docs[0]
  assert.equal(entry.race, 40)
  assert.equal(entry.user, user.id)
  console.log('PASS local demo restore preserves exported IDs and account relations')
  const rows = snapshot.registrations as Array<{ race: number }>
  rows[0].race = 99999
  await writeFile(resolve(sandbox, 'work/demo-export.json'), JSON.stringify(snapshot))
  result = run()
  assert.notEqual(result.status, 0)
  assert.equal((await payload.findByID({ collection: 'races', id: 40 })).slug, 'restore-fixture')
  assert.equal((await payload.find({ collection: 'registrations', depth: 0 })).docs[0].race, 40)
  console.log('PASS failed local restore rolls back deleted sports records')
  await payload.update({ collection: 'users', id: user.id, data: { demoAccount: false } })
  await assert.rejects(() => assertDemoAccountsOnly(payload))
  result = run()
  assert.notEqual(result.status, 0)
  assert.equal((await payload.count({ collection: 'races' })).totalDocs, 1)
  console.log('PASS real accounts block demo operations before sports changes')
} finally {
  await payload.destroy()
}
process.exit(0)
