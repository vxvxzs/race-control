export const maxDuration = 60
import { flushMail } from '@/lib/serverless-mail'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import { issueVerification } from '@/lib/verification'
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Zaloguj się.' }, { status: 401 })
  if (user.emailVerified) return NextResponse.json({ success: true })
  try {
    const payload = await getPayloadClient()
    const mailId = await issueVerification(payload, user.id)
    if (mailId) await flushMail(payload, [mailId])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Poczekaj minutę przed ponowną wysyłką.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }
}
