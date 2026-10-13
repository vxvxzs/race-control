import './production-env'
import { randomBytes } from 'node:crypto'
const { getPayloadClient } = await import('../src/lib/payload')
const payload = await getPayloadClient()
try {
  const reviewers = await payload.find({
    collection: 'users',
    pagination: false,
    where: { reviewerAccess: { equals: true } },
  })
  for (const user of reviewers.docs)
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { disabled: true, sessions: [], password: randomBytes(32).toString('hex') },
    })
  console.log(`Disabled ${reviewers.totalDocs} reviewers and revoked all sessions.`)
} finally {
  await payload.destroy()
}
process.exit(0)
