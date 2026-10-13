import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Zaloguj się.' }, { status: 401 })
  const payload = await getPayloadClient()
  const [list, unread] = await Promise.all([
    payload.find({
      collection: 'notifications',
      overrideAccess: false,
      user,
      depth: 0,
      sort: '-createdAt',
      limit: 30,
    }),
    payload.count({
      collection: 'notifications',
      overrideAccess: false,
      user,
      where: { read: { equals: false } },
    }),
  ])
  return NextResponse.json(
    { notifications: list.docs, unread: unread.totalDocs },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Zaloguj się.' }, { status: 401 })
  const { id } = await req.json()
  const payload = await getPayloadClient()
  if (typeof id !== 'number' && typeof id !== 'string')
    return NextResponse.json({ error: 'Nieprawidłowe ID.' }, { status: 400 })
  try {
    await payload.update({
      collection: 'notifications',
      id,
      overrideAccess: false,
      user,
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Brak uprawnień.' }, { status: 403 })
  }
}
