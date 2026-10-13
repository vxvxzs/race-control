import { assertLocalDemo, assertDemoAccountsOnly } from './demo-safety'
import 'dotenv/config'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'
import { getPayloadClient } from '../src/lib/payload'
assertLocalDemo()
const payload = await getPayloadClient()
await assertDemoAccountsOnly(payload)
const users = await payload.db.find({ collection: 'users', pagination: false })
let count = 0
for (const user of users.docs as Array<{ id: number; salt?: string; hash?: string }>) {
  if (!user.salt || !user.hash) continue
  const salt = user.salt
  const modern = user.hash.startsWith('pbkdf2-sha256-v1:')
  const stored = modern ? user.hash.slice('pbkdf2-sha256-v1:'.length) : user.hash
  const known = ['RaceControl2026!', 'DriverPassword123!', 'SecurePassword123!'].some(
    (password) => {
      const hash = pbkdf2Sync(
        password,
        salt,
        modern ? 600000 : 25000,
        modern ? 32 : 512,
        'sha256',
      ).toString('hex')
      return (
        hash.length === stored.length && timingSafeEqual(Buffer.from(hash), Buffer.from(stored))
      )
    },
  )
  if (known) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { password: randomBytes(32).toString('hex'), demoAccount: true, sessions: [] },
    })
    count++
  }
}
console.log(`Disabled known demo passwords: ${count}. Results and profiles retained.`)
await payload.destroy()

process.exit(0)
