import { assertLocalDemo, assertDemoAccountsOnly } from './demo-safety'
import 'dotenv/config'
import { readDemoExport } from './demo-export'
import { beginTransaction } from '@payloadcms/drizzle'
if (!process.argv.includes('--restore-demo-sports'))
  throw new Error('Explicit --restore-demo-sports required; this replaces demo sports data')
// Use a backed-up local SQLite copy. Accounts and infrastructure secrets are retained.
const data = await readDemoExport()
const { getPayloadClient } = await import('../src/lib/payload')
assertLocalDemo()
const payload = await getPayloadClient()
try {
  await assertDemoAccountsOnly(payload)
  const users = await payload.find({ collection: 'users', pagination: false, depth: 0 })
  const userIDs = new Set(users.docs.map((user) => user.id))
  if (
    data.registrations.some(
      (row) => !userIDs.has(typeof row.user === 'number' ? row.user : row.user.id),
    ) ||
    data.results.some((row) =>
      row.entries.some(
        (entry) => !userIDs.has(typeof entry.driver === 'number' ? entry.driver : entry.driver.id),
      ),
    )
  )
    throw new Error('Demo export references missing accounts; no records changed')
  const { createLocalReq, commitTransaction, killTransaction } = await import('payload')
  const req = await createLocalReq({}, payload)
  const transactionID = await beginTransaction.call(payload.db, { behavior: 'immediate' })
  if (!transactionID) throw new Error('Demo restore requires a database transaction')
  req.transactionID = transactionID
  try {
    // Preserve exported race IDs so registrations and result relations still match.
    payload.db.allowIDOnCreate = true
    for (const collection of ['results', 'registrations', 'announcements', 'races'] as const)
      await payload.delete({
        collection,
        where: { id: { greater_than: 0 } },
        req,
        context: { skipEvents: true },
      })
    for (const collection of ['races', 'registrations', 'results', 'announcements'] as const)
      for (const row of data[collection])
        await payload.create({
          collection,
          data: row,
          req,
          context: { migrationImport: true, skipEvents: true },
        })
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
  console.log('Demo sports restored; accounts and sessions retained.')
} finally {
  await payload.destroy()
}
process.exit(0)
