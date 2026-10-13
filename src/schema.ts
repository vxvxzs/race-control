import 'dotenv/config'
if (!/^file:/.test(process.env.DATABASE_URL || 'file:./racecontrol.db'))
  throw new Error('Schema push is local SQLite only; use reviewed migrations for PostgreSQL')
process.env.PAYLOAD_DB_PUSH = 'true'
const { getPayloadClient } = await import('./lib/payload')
const payload = await getPayloadClient()
console.log('Schema ready. Stop other database processes before running this command.')
await payload.destroy()

process.exit(0)
