import type { CollectionSlug } from 'payload'
import { assertLocalDemo } from './demo-safety'
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
// Read a working COPY, never alter the user's live SQLite database.
assertLocalDemo()
await access('work/production-source.db')
process.env.DATABASE_URL = 'file:./work/production-source.db'
process.env.PAYLOAD_DB_PUSH = 'true'
const { getPayloadClient } = await import('../src/lib/payload')
assertLocalDemo()
const payload = await getPayloadClient()
async function read<K extends CollectionSlug>(collection: K) {
  return (await payload.find({ collection, depth: 0, pagination: false, showHiddenFields: true }))
    .docs
}
try {
  const data = {
    users: await read('users'),
    races: await read('races'),
    registrations: await read('registrations'),
    results: await read('results'),
    announcements: await read('announcements'),
    notifications: await read('notifications'),
    'email-outbox': await read('email-outbox'),
    media: await read('media'),
  }
  if (data.media.length)
    throw new Error('Persistent media storage must be configured before importing uploads')
  const replacements: Array<[string, string]> = []
  for (const user of data.users) {
    const oldName = user.name
    const name =
      user.id === 11
        ? 'Michał Zieliński'
        : user.id === 1
          ? 'Organizator demo'
          : user.id === 14
            ? 'Archiwalny organizator'
            : [10, 12, 13, 15].includes(user.id)
              ? `Konto archiwalne ${user.id}`
              : oldName
    replacements.push([oldName, name])
    Object.assign(user, {
      name,
      email: `driver-${user.id}@example.test`,
      steamId: null,
      bio: null,
      demoAccount: true,
      reviewerAccess: false,
      disabled: true,
      verificationHash: null,
      verificationExpires: null,
      verificationSentAt: null,
      sessions: [],
      resetPasswordToken: null,
      resetPasswordExpiration: null,
      loginAttempts: 0,
      lockUntil: null,
    })
    const auth = user as typeof user & { hash?: string; salt?: string }
    delete auth.hash
    delete auth.salt
    delete auth.password
  }
  for (const race of data.races) race.serverPassword = `DEMO-${randomBytes(12).toString('hex')}`
  for (const collection of ['notifications', 'email-outbox'] as const)
    for (const row of data[collection]) {
      for (const [a, b] of replacements) {
        row.message = row.message.replaceAll(a, b)
        if ('subject' in row) row.subject = row.subject.replaceAll(a, b)
      }
      if (collection === 'email-outbox')
        Object.assign(row, {
          recipient: `archive-${row.id}@example.test`,
          link: null,
          status: 'suppressed',
          lastError: 'Archived local demo event; never send historical verification or messages.',
          providerMessageId: null,
          acceptedAt: null,
          deliveredAt: null,
        })
    }
  await mkdir('work', { recursive: true })
  await writeFile('work/demo-export.json', JSON.stringify(data, null, 2))
  console.log(
    'Sanitized demo export:',
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
  )
} finally {
  await payload.destroy()
}
process.exit(0)
