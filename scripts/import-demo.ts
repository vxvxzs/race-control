import { readDemoExport, exportedRelation, demoCollections } from './demo-export'
import './production-env'
if (process.env.VERCEL || !process.argv.includes('--import-empty-demo'))
  throw new Error('Explicit --import-empty-demo required; never run this during deployment')
import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { calculateChampionshipStandings } from '../src/lib/standings'
import { resultRaces } from '../src/lib/result-view'
const { getPayloadClient } = await import('../src/lib/payload')
const payload = await getPayloadClient()
const data = await readDemoExport()
const collections = demoCollections
const credentialsPath = 'work/production-accounts.private.json'
try {
  for (const collection of collections) {
    if ((await payload.count({ collection })).totalDocs)
      throw new Error(
        'Import only into an empty application database; existing records are never overwritten',
      )
  }
  let credentials: {
    owner: { email: string; password: string }
    reviewer: { email: string; password: string }
  }
  try {
    credentials = JSON.parse(await readFile(credentialsPath, 'utf8'))
  } catch {
    credentials = {
      owner: { email: process.env.OWNER_EMAIL!, password: randomBytes(24).toString('base64url') },
      reviewer: { email: 'reviewer@example.test', password: randomBytes(24).toString('base64url') },
    }
    if (!credentials.owner.email) throw new Error('OWNER_EMAIL required')
    await writeFile(credentialsPath, JSON.stringify(credentials, null, 2))
  }
  const req = await (await import('payload')).createLocalReq({}, payload)
  await (await import('payload')).initTransaction(req)
  try {
    for (const collection of collections)
      for (const row of data[collection]) {
        await payload.create({
          collection,
          req,
          context: { migrationImport: true, skipEvents: true },
          data: {
            ...row,
            ...(collection === 'users' ? { password: randomBytes(32).toString('hex') } : {}),
          },
        })
      }
    await (await import('payload')).commitTransaction(req)
  } catch (error) {
    await (await import('payload')).killTransaction(req)
    throw error
  }
  const counts: Record<string, number> = {}
  for (const collection of collections) {
    counts[collection] = (await payload.count({ collection })).totalDocs
    if (counts[collection] !== data[collection].length)
      throw new Error(`Count mismatch: ${collection}`)
  }
  const sourceResults = data.results.map((r) => ({
    ...r,
    race: exportedRelation(data.races, r.race),
    entries: r.entries.map((e) => ({
      ...e,
      driver: exportedRelation(data.users, e.driver),
    })),
  }))
  const before = calculateChampionshipStandings(resultRaces(sourceResults))
  const after = calculateChampionshipStandings(
    resultRaces((await payload.find({ collection: 'results', depth: 2, pagination: false })).docs),
  )
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('Standings changed during migration')
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  // Explicit imported IDs require advancing the PostgreSQL serial sequences.
  await pool.query(
    `DO $$ DECLARE r record; n bigint; seq text; BEGIN FOR r IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='id' AND data_type='integer' LOOP seq:=pg_get_serial_sequence(format('%I',r.table_name),'id'); IF seq IS NOT NULL THEN EXECUTE format('SELECT max(id) FROM %I',r.table_name) INTO n; IF n IS NOT NULL THEN PERFORM setval(seq,n,true); END IF; END IF; END LOOP; END $$;`,
  )
  await pool.end()
  for (const [kind, account] of Object.entries(credentials))
    await payload.create({
      collection: 'users',
      data: {
        ...account,
        name: kind === 'owner' ? 'Jakub — właściciel' : 'Przemysław — reviewer',
        role: 'admin',
        reviewerAccess: kind === 'reviewer',
        emailVerified: true,
        publicProfile: false,
        disabled: false,
      },
    })
  await writeFile(
    'work/production-integrity.json',
    JSON.stringify(
      {
        counts,
        resultsEntries: data.results.reduce((n, r) => n + r.entries.length, 0),
        standingsUnchanged: true,
        standings: after,
        accountsCreated: 2,
        legacyAuthenticationReset: true,
        legacyPIIRemoved: true,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS counts, relationships and complete standings preserved. Two separate private admins created.',
  )
} finally {
  await payload.destroy()
}
process.exit(0)
