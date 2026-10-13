import { serverURL } from './server-url'
import { claimVerification } from './atomic'
import { createHash, randomBytes } from 'node:crypto'
import type { Payload } from 'payload'
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const tokenValid = (
  hash: string | null | undefined,
  expires: string | null | undefined,
  token: string,
) => Boolean(hash && expires && hashToken(token) === hash && Date.parse(expires) > Date.now())
export async function issueVerification(payload: Payload, id: number | string) {
  const user = await payload.findByID({ collection: 'users', id, showHiddenFields: true })
  if (user.emailVerified) return
  const token = randomBytes(32).toString('hex')
  const hash = hashToken(token)
  if (!(await claimVerification(payload, id, hash)).length)
    throw new Error('Poczekaj minutę przed ponowną wysyłką.')
  const mail = await payload.create({
    collection: 'email-outbox',
    data: {
      key: `verify:${id}:${hash}`,
      recipient: user.email,
      subject: 'Potwierdź adres e-mail',
      message:
        'Witaj w RACE CONTROL. Potwierdź swój adres, aby zapisywać się na wyścigi. Link jest ważny przez 24 godziny.',
      link: `${serverURL()}/verify-email?token=${token}`,
      status: 'pending',
    },
  })
  return mail.id
}
