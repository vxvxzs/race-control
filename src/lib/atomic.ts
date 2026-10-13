import { and, eq, gt, lt, or, isNull, sql } from 'drizzle-orm'
import type { Payload } from 'payload'
// Conditional SQL updates are atomic across workers on SQLite and Postgres.
export async function consumeVerification(payload: Payload, hash: string) {
  const db = payload.db as any,
    t = db.tables.users
  return db.drizzle
    .update(t)
    .set({ emailVerified: true, verificationHash: null, verificationExpires: null })
    .where(
      and(
        eq(t.verificationHash, hash),
        gt(t.verificationExpires, new Date().toISOString()),
        eq(t.emailVerified, false),
      ),
    )
    .returning({ id: t.id })
}
export async function claimMail(payload: Payload, id: string | number) {
  const db = payload.db as any,
    t = db.tables.email_outbox
  return db.drizzle
    .update(t)
    .set({
      status: 'sending',
      updatedAt: new Date().toISOString(),
      attempts: sql`coalesce(${t.attempts}, 0) + 1`,
      firstAttemptAt: sql`coalesce(${t.firstAttemptAt}, ${new Date().toISOString()})`,
    })
    .where(
      and(
        eq(t.id, id),
        or(
          and(
            eq(t.status, 'pending'),
            or(isNull(t.nextAttempt), lt(t.nextAttempt, new Date().toISOString())),
          ),
          and(
            eq(t.status, 'sending'),
            lt(t.updatedAt, new Date(Date.now() - 120000).toISOString()),
          ),
        ),
        lt(t.attempts, 3),
      ),
    )
    .returning({ id: t.id })
}
export async function claimVerification(payload: Payload, id: number | string, hash: string) {
  const db = payload.db as any,
    t = db.tables.users
  const now = new Date().toISOString()
  return db.drizzle
    .update(t)
    .set({
      verificationHash: hash,
      verificationExpires: new Date(Date.now() + 86400000).toISOString(),
      verificationSentAt: now,
    })
    .where(
      and(
        eq(t.id, id),
        eq(t.emailVerified, false),
        or(
          isNull(t.verificationSentAt),
          lt(t.verificationSentAt, new Date(Date.now() - 60000).toISOString()),
        ),
      ),
    )
    .returning({ id: t.id })
}
