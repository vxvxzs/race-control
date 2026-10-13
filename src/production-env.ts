import dotenv from 'dotenv'
if (!process.env.VERCEL)
  dotenv.config({ path: '.env.production.local', override: true, quiet: true })
if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || ''))
  throw new Error('Production commands require a PostgreSQL DATABASE_URL')
if (process.env.PAYLOAD_DB_PUSH === 'true') throw new Error('Production schema push is forbidden')
