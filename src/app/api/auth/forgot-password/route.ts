import { after, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { systemEmailKey } from '@/lib/payload-email'
import { flushMail } from '@/lib/serverless-mail'
import {
  recoveryBody,
  recoveryEmail,
  recoveryIP,
  recoveryMessage,
  takeRecoveryLimit,
} from '@/lib/password-recovery'
export const maxDuration = 60

export async function POST(request: Request) {
  let email: string
  try {
    const body = await recoveryBody(request)
    if (
      typeof body.email !== 'string' ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    )
      throw new Error('Invalid email')
    email = body.email.trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Podaj poprawny adres e-mail.' }, { status: 400 })
  }
  try {
    const payload = await getPayloadClient()
    const ipAllowed = await takeRecoveryLimit(payload, `forgot:ip:${recoveryIP(request)}`, 5)
    const emailAllowed =
      ipAllowed && (await takeRecoveryLimit(payload, `forgot:email:${email}`, 3, 3600000))
    if (emailAllowed)
      after(async () => {
        try {
          // Existence lookup and mail delivery happen after the identical response.
          // Payload owns token generation, expiry and its per-account cooldown.
          const token = await payload.forgotPassword({
            collection: 'users',
            data: { email },
            context: { passwordRecovery: true },
          })
          if (token) {
            const mail = await payload.find({
              collection: 'email-outbox',
              where: {
                key: {
                  equals: systemEmailKey(
                    email,
                    'Ustaw nowe hasło — Race Control',
                    recoveryEmail(token),
                  ),
                },
              },
              limit: 1,
              depth: 0,
            })
            if (mail.docs[0]) await flushMail(payload, [mail.docs[0].id])
          }
        } catch {
          console.error('Password recovery delivery failed; inspect private outbox status.')
        }
      })
    return NextResponse.json({ success: true, message: recoveryMessage })
  } catch {
    console.error('Password recovery service unavailable.')
    return NextResponse.json(
      { error: 'Odzyskiwanie hasła jest chwilowo niedostępne. Spróbuj ponownie później.' },
      { status: 503 },
    )
  }
}
