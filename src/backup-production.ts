import './production-env'
import pg from 'pg'
import { mkdir, writeFile } from 'node:fs/promises'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
const client = await pool.connect()
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const tables = await client.query(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  )
  const data: Record<string, unknown[]> = {}
  for (const { tablename } of tables.rows) {
    if (!/^[a-z0-9_]+$/.test(tablename)) throw new Error('Unexpected table name')
    data[tablename] = (await client.query(`SELECT * FROM "${tablename}"`)).rows
  }
  await client.query('COMMIT')
  await mkdir('work', { recursive: true })
  const path = `work/neon-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.private.json`
  await writeFile(
    path,
    JSON.stringify(
      { schemaVersion: 1, createdAt: new Date().toISOString(), tables: data },
      null,
      2,
    ),
  )
  console.log('Private consistent Neon backup saved:', path)
} finally {
  client.release()
  await pool.end()
}
