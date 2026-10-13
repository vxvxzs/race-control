import { APIError } from 'payload'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import {
  invalidResetMessage,
  recoveryBody,
  recoveryIP,
  resetPasswordOnce,
  takeRecoveryLimit,
  validResetToken,
} from '@/lib/password-recovery'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await recoveryBody(request)
    if (!validResetToken(token))
      return NextResponse.json({ error: invalidResetMessage }, { status: 400 })
    if (typeof password !== 'string' || password.length < 10 || password.length > 128)
      return NextResponse.json({ error: 'Hasło musi mieć od 10 do 128 znaków.' }, { status: 400 })
    if (password !== confirmPassword)
      return NextResponse.json({ error: 'Hasła nie są identyczne.' }, { status: 400 })
    const payload = await getPayloadClient()
    if (!(await takeRecoveryLimit(payload, `reset:ip:${recoveryIP(request)}`, 10)))
      return NextResponse.json(
        { error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' },
        { status: 429 },
      )
    await resetPasswordOnce(payload, token, password)
    const response = NextResponse.json({
      success: true,
      message: 'Hasło zostało zmienione. Zaloguj się nowym hasłem.',
    })
    response.cookies.set({
      name: 'payload-token',
      value: '',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    })
    return response
  } catch (error) {
    if (!(error instanceof APIError) && !(error instanceof SyntaxError)) {
      console.error('Password reset service unavailable.')
      return NextResponse.json(
        { error: 'Zmiana hasła jest chwilowo niedostępna. Spróbuj ponownie później.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: invalidResetMessage }, { status: 400 })
  }
}
