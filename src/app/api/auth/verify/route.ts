import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { hashToken } from '@/lib/verification'
import { consumeVerification } from '@/lib/atomic'
export async function POST(req: Request) {
  const { token } = await req.json()
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    return NextResponse.json(
      { error: 'Link jest nieprawidłowy, wygasł lub został już użyty.' },
      { status: 400 },
    )
  const payload = await getPayloadClient()
  const matched = await consumeVerification(payload, hashToken(token))
  if (!matched.length)
    return NextResponse.json(
      { error: 'Link jest nieprawidłowy, wygasł lub został już użyty.' },
      { status: 400 },
    )
  return NextResponse.json({ success: true })
}
