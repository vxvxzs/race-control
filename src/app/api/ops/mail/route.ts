import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { processEmailOutbox } from '@/lib/notifications'
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'
async function recover(req: Request) {
  const expected = process.env.CRON_SECRET
  const actual = req.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await processEmailOutbox(await getPayloadClient(), undefined, { limit: 10, budgetMs: 45000 })
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
// Fixed database queue only. Never accepts recipient, content, or a new idempotency key.
export const GET = recover
export const POST = recover
