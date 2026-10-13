import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'races',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    depth: 0,
    limit: 1,
  })
  const race = result.docs[0]
  if (!race) return NextResponse.json({ error: 'Nie znaleziono wyścigu.' }, { status: 404 })
  const count = await payload.count({
    collection: 'registrations',
    where: { and: [{ race: { equals: race.id } }, { status: { equals: 'accepted' } }] },
  })
  return NextResponse.json(
    {
      acceptedCount: count.totalDocs,
      maxParticipants: race.maxParticipants,
      registrationStatus: race.registrationStatus,
      raceStatus: race.raceStatus,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
