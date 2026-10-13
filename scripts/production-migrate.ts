import './production-env'
import pg from 'pg'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
const lock = await pool.connect()
let payload:
  Awaited<ReturnType<(typeof import('../src/lib/payload'))['getPayloadClient']>> | undefined
try {
  // Transaction locks work with Neon's pooled connections and serialize concurrent builds.
  await lock.query('BEGIN')
  await lock.query("SELECT pg_advisory_xact_lock(hashtext('race-control-schema-migrations'))")
  const existing = await lock.query("SELECT to_regclass('public.payload_migrations') AS name")
  if (existing.rows[0].name) {
    const dev = await lock.query(
      'SELECT count(*) AS count FROM payload_migrations WHERE batch = -1',
    )
    if (Number(dev.rows[0].count))
      throw new Error('Refusing migration over a pushed development schema')
  }
  const { getPayloadClient } = await import('../src/lib/payload')
  payload = await getPayloadClient()
  await payload.db.migrate()
  await lock.query('COMMIT')
  console.log('Reviewed PostgreSQL migrations applied; schema push disabled.')
} catch {
  await lock.query('ROLLBACK')
  throw new Error('Production migration failed; deployment stopped. Inspect migration diagnostics.')
} finally {
  lock.release()
  await pool.end()
  if (payload) await payload.destroy()
}
process.exit(0)
