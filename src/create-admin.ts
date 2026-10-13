import 'dotenv/config'
import { getPayloadClient } from './lib/payload'
if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 14
)
  throw new Error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 14 characters) in your shell. Do not commit them.',
  )
const payload = await getPayloadClient()
try {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: process.env.ADMIN_EMAIL.toLowerCase() } },
    limit: 1,
  })
  if (existing.totalDocs)
    throw new Error('Account already exists. This command never changes an existing account.')
  await payload.create({
    collection: 'users',
    data: {
      name: process.env.ADMIN_NAME || 'Race Director',
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      emailVerified: true,
    },
  })
  console.log('Private administrator account created. Credentials were not printed.')
} finally {
  await payload.destroy()
}

process.exit(0)
