import type { Payload } from 'payload'

export function assertLocalDemo(environment: Partial<NodeJS.ProcessEnv> = process.env) {
  if (
    environment.VERCEL ||
    environment.NODE_ENV === 'production' ||
    !/^file:/.test(environment.DATABASE_URL || 'file:./racecontrol.db')
  )
    throw new Error(
      'Demo tools are local SQLite only. Production/PostgreSQL and Vercel are forbidden.',
    )
}

export async function assertDemoAccountsOnly(payload: Payload) {
  const accounts = await payload.count({
    collection: 'users',
    where: { or: [{ demoAccount: { equals: false } }, { demoAccount: { exists: false } }] },
  })
  if (accounts.totalDocs)
    throw new Error(
      'Refusing demo changes: database contains non-demo accounts. Use an isolated demo copy.',
    )
}
