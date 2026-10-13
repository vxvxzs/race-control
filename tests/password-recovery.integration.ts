import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { rm, mkdir } from 'node:fs/promises'
process.env.DATABASE_URL = 'file:./work/recovery-test.db'
process.env.PAYLOAD_DB_PUSH = 'true'
process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
process.env.MAIL_MODE = 'preview'
await mkdir('work', { recursive: true })
await rm('work/recovery-test.db', { force: true })
const { getPayloadClient } = await import('../src/lib/payload')
const { resetPasswordOnce, takeRecoveryLimit } = await import('../src/lib/password-recovery')
const { issueVerification, hashToken } = await import('../src/lib/verification')
const { consumeVerification } = await import('../src/lib/atomic')
const payload = await getPayloadClient()
const checks: string[] = []
const pass = (label: string) => {
  checks.push(label)
  console.log('PASS ' + label)
}
const email = 'recovery@example.test',
  oldPassword = randomBytes(20).toString('hex'),
  newPassword = randomBytes(20).toString('hex')
try {
  const user = await payload.create({
    collection: 'users',
    data: {
      name: 'Jakub Jałocha',
      email,
      password: oldPassword,
      role: 'driver',
      emailVerified: true,
    },
  })
  const login = await payload.login({ collection: 'users', data: { email, password: oldPassword } })
  const token = await payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: true,
    context: { passwordRecovery: true },
  })
  assert.ok(token)
  assert.match(token, /^[a-f0-9]{40}$/)
  pass('Payload generates native 160-bit token')
  const concurrent = await Promise.allSettled([
    resetPasswordOnce(payload, token, newPassword),
    resetPasswordOnce(payload, token, newPassword),
  ])
  assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1)
  pass('Exactly one concurrent reset succeeds')
  await assert.rejects(() => resetPasswordOnce(payload, token, newPassword))
  pass('Token replay rejected')
  await assert.rejects(() =>
    payload.login({ collection: 'users', data: { email, password: oldPassword } }),
  )
  pass('Old password rejected')
  const freshLogin = await payload.login({
    collection: 'users',
    data: { email, password: newPassword },
  })
  assert.equal(freshLogin.user?.role, 'driver')
  pass('New password works without role escalation')
  const session = await payload.auth({
    headers: new Headers({ authorization: `JWT ${login.token}` }),
  })
  assert.equal(session.user, null)
  pass('Old session revoked')
  const expirationToken = await payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: true,
    context: { passwordRecovery: true },
  })
  assert.ok(expirationToken)
  await payload.db.updateOne({
    collection: 'users',
    id: user.id,
    data: { resetPasswordExpiration: new Date(Date.now() - 1000).toISOString() },
  })
  await assert.rejects(() => resetPasswordOnce(payload, expirationToken, oldPassword))
  pass('Expired native token rejected')
  await assert.rejects(() => payload.forgotPassword({ collection: 'users', data: { email } }))
  pass('Native bypass without recovery policy rejected')
  const limits = await Promise.all(
    Array.from({ length: 8 }, () => takeRecoveryLimit(payload, 'test:concurrent', 3)),
  )
  assert.equal(limits.filter(Boolean).length, 3)
  pass('Shared limiter atomically permits only configured quota')
  assert.equal(
    await payload.forgotPassword({
      collection: 'users',
      data: { email: 'absent@example.test' },
      disableEmail: true,
      context: { passwordRecovery: true },
    }),
    null,
  )
  pass('Unknown account silently ignored')
  await issueVerification(payload, user.id) // Verified accounts remain verified.
  const unverified = await payload.create({
    collection: 'users',
    data: {
      name: 'Łukasz',
      email: 'unverified@example.test',
      password: oldPassword,
      role: 'driver',
    },
  })
  const verificationMailID = await issueVerification(payload, unverified.id)
  assert.ok(verificationMailID)
  const mail = await payload.findByID({ collection: 'email-outbox', id: verificationMailID })
  const verificationToken = new URL(mail.link!).searchParams.get('token')!
  assert.equal((await consumeVerification(payload, hashToken(verificationToken))).length, 1)
  pass('Registration and email verification regression')
  console.log(`${checks.length} recovery checks passed on isolated SQLite.`)
} finally {
  await payload.destroy()
}
process.exit(0)
