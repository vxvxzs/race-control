import './production-env'
import { readFile } from 'node:fs/promises'
if (!process.argv.includes('--restore-demo-sports'))
  throw new Error('Explicit --restore-demo-sports required; this replaces demo sports data')
// Run npm run db:backup first. Accounts and infrastructure secrets are never reset here.
const data = JSON.parse(await readFile('work/demo-export.json', 'utf8'))
const { getPayloadClient } = await import('./lib/payload')
const payload = await getPayloadClient()
try {
  const { createLocalReq, initTransaction, commitTransaction, killTransaction } =
    await import('payload')
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
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
