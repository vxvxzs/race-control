import { createHmac } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { beginTransaction } from '@payloadcms/drizzle'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { APIError, createLocalReq, type Payload } from 'payload'
import { renderEmail } from './notifications'
import { serverURL } from './server-url'

export const recoveryMessage =
  'Jeśli konto z tym adresem istnieje, otrzymasz link do ustawienia nowego hasła.'
export const invalidResetMessage =
  'Link jest nieprawidłowy, wygasł lub został już użyty. Poproś o nowy link.'
export const validResetToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f0-9]{40}$/.test(token)

export function recoveryEmail(token: string) {
  const link = `${serverURL()}/reset-password?token=${encodeURIComponent(token)}`
  return renderEmail(
    'Ustaw nowe hasło',
    'Otrzymaliśmy prośbę o zmianę hasła do Twojego konta Race Control. Link jest jednorazowy i ważny przez 30 minut. Jeśli nie wysyłano tej prośby, zignoruj wiadomość — hasło pozostanie bez zmian.',
    link,
    'Ustaw nowe hasło',
  )
}

export function requireRecoveryContext(operation: string, context: Record<string, unknown>) {
  if (['forgotPassword', 'resetPassword'].includes(operation) && context.passwordRecovery !== true)
    throw new APIError('Skorzystaj z formularza odzyskiwania hasła Race Control.', 403)
}

export async function takeRecoveryLimit(
  payload: Payload,
  value: string,
  limit: number,
  windowMs = 900000,
) {
  const key = createHmac('sha256', payload.config.secret).update(value).digest('hex')
  const now = new Date().toISOString()
  const end = new Date(Date.now() + windowMs).toISOString()
  const query = sql`INSERT INTO auth_request_limits ("key", "count", expires_at, created_at, updated_at)
    VALUES (${key}, 1, ${end}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN auth_request_limits.expires_at <= ${now} THEN 1 ELSE auth_request_limits."count" + 1 END,
      expires_at = CASE WHEN auth_request_limits.expires_at <= ${now} THEN ${end} ELSE auth_request_limits.expires_at END,
      updated_at = ${now}
    WHERE auth_request_limits.expires_at <= ${now} OR auth_request_limits."count" < ${limit}
    RETURNING id`
  const cleanup = sql`DELETE FROM auth_request_limits WHERE expires_at < ${new Date(Date.now() - 86400000).toISOString()}`
  if (payload.db.name === 'postgres') {
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const result = await db.execute(query)
    await db.execute(cleanup)
    return result.rows.length > 0
  }
  const db = (payload.db as unknown as SQLiteAdapter).drizzle
  const result = await db.all(query)
  await db.run(cleanup)
  return result.length > 0
}

export function recoveryIP(request: Request) {
  // Vercel supplies this header; local test traffic shares a single bucket.
  return process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : 'local'
}

const sqliteResetQueues = new WeakMap<Payload, Promise<void>>()
export async function resetPasswordOnce(payload: Payload, token: string, password: string) {
  if (payload.db.name !== 'sqlite') return resetInTransaction(payload, token, password)
  // libSQL's local client is a single writer. Keep its transaction lifecycle serial;
  // the database condition still enforces token ownership and expiry.
  const previous = sqliteResetQueues.get(payload) || Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  sqliteResetQueues.set(
    payload,
    previous.then(() => current),
  )
  await previous
  try {
    await resetInTransaction(payload, token, password)
  } finally {
    release()
  }
}
async function resetInTransaction(payload: Payload, token: string, password: string) {
  const req = await createLocalReq({ context: { passwordRecovery: true } }, payload)
  const transactionID =
    payload.db.name === 'sqlite'
      ? await beginTransaction.call(payload.db, { behavior: 'immediate' })
      : await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Password reset requires database transactions')
  req.transactionID = transactionID
  try {
    // Atomic conditional UPDATE obtains a write lock before Payload reads the token.
    // A concurrent reset waits and then sees the expired/cleared token after commit.
    const user = await payload.db.updateOne({
      collection: 'users',
      data: { updatedAt: new Date().toISOString() },
      options: { atomic: true },
      req,
      where: {
        and: [
          { resetPasswordToken: { equals: token } },
          { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
        ],
      },
    })
    if (!user) throw new APIError(invalidResetMessage, 400)
    await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: true,
      req,
    })
    // Payload already revokes old sessions. Discard its new login session as well:
    // the public reset flow requires a fresh, explicit login with the new password.
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { resetPasswordToken: null, sessions: [] },
      overrideAccess: true,
      req,
    })
    await payload.db.commitTransaction(transactionID)
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
    throw error
  }
}

export async function recoveryBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > 4096) throw new APIError('Nieprawidłowe dane formularza.', 400)
  const value: unknown = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new APIError('Nieprawidłowe dane formularza.', 400)
  return value as Record<string, unknown>
}
