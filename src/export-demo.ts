import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
// Read a working COPY, never alter the user's live SQLite database.
process.env.DATABASE_URL = 'file:./work/production-source.db'
process.env.PAYLOAD_DB_PUSH = 'true'
const { getPayloadClient } = await import('./lib/payload')
const payload = await getPayloadClient()
const collections = [
  'users',
  'races',
  'registrations',
  'results',
  'announcements',
  'notifications',
  'email-outbox',
  'media',
] as const
const data: Record<string, any[]> = {}
try {
  for (const collection of collections)
    data[collection] = (
      await payload.find({ collection, depth: 0, pagination: false, showHiddenFields: true })
    ).docs
  if (data.media.length)
    throw new Error('Persistent media storage must be configured before importing uploads')
  const replacements: Array<[string, string]> = []
  for (const user of data.users) {
    const oldName = user.name as string
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
    for (const key of ['hash', 'salt', 'password']) delete user[key]
  }
  for (const race of data.races) race.serverPassword = `DEMO-${randomBytes(12).toString('hex')}`
  for (const collection of ['notifications', 'email-outbox'])
    for (const row of data[collection]) {
      for (const key of ['subject', 'message'])
        if (row[key]) for (const [a, b] of replacements) row[key] = row[key].replaceAll(a, b)
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
