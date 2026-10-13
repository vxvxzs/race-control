import { serverURL } from './lib/server-url'
import { payloadEmail } from './lib/payload-email'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { AuthRequestLimits } from './collections/AuthRequestLimits'
import { Notifications, EmailOutbox } from './collections/Notifications'
import { Users } from './collections/Users'
import { Races } from './collections/Races'
import { Registrations } from './collections/Registrations'
import { Results } from './collections/Results'
import { Announcements } from './collections/Announcements'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const dbUrl = process.env.DATABASE_URL || 'file:./racecontrol.db'
if (
  !process.env.PAYLOAD_SECRET ||
  process.env.PAYLOAD_SECRET.length < 32 ||
  /^(replace-|your-)/.test(process.env.PAYLOAD_SECRET)
)
  throw new Error('Set a unique PAYLOAD_SECRET with at least 32 characters')
if (process.env.VERCEL && !/^postgres(ql)?:\/\//.test(dbUrl))
  throw new Error('Vercel requires PostgreSQL; SQLite is local-only')
if (process.env.VERCEL && process.env.PAYLOAD_DB_PUSH === 'true')
  throw new Error('Schema push is forbidden on Vercel; run reviewed migrations')
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')

export default buildConfig({
  serverURL: serverURL(),
  email: payloadEmail,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Races,
    Registrations,
    Results,
    Announcements,
    Media,
    Notifications,
    EmailOutbox,
    AuthRequestLimits,
  ],
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    (() => {
      throw new Error('PAYLOAD_SECRET is required')
    })(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: isPostgres
    ? postgresAdapter({
        allowIDOnCreate: true,
        migrationDir: path.resolve(dirname, 'migrations/postgres'),
        disableCreateDatabase: true,
        push: process.env.PAYLOAD_DB_PUSH === 'true',
        pool: {
          connectionString: dbUrl,
          max: 4,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 15000,
        },
      })
    : sqliteAdapter({
        push: process.env.PAYLOAD_DB_PUSH === 'true',
        client: {
          url: dbUrl,
        },
      }),
})
