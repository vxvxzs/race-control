import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { activeSeason } from '@/lib/season'
import { apiError } from '@/lib/api-error'

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'races',
      depth: 0,
      limit: 1,
      sort: 'date',
      where: {
        and: [
          { isPublished: { equals: true } },
          { season: { equals: activeSeason } },
          { raceStatus: { equals: 'upcoming' } },
          { date: { greater_than_equal: new Date().toISOString() } },
        ],
      },
    })
    const race = result.docs[0]
    if (!race)
      return NextResponse.json({ race: null }, { headers: { 'Cache-Control': 'no-store' } })
    const count = await payload.count({
      collection: 'registrations',
      where: { and: [{ race: { equals: race.id } }, { status: { equals: 'accepted' } }] },
    })
    return NextResponse.json(
      {
        race: {
          slug: race.slug,
          acceptedCount: count.totalDocs,
          maxParticipants: race.maxParticipants,
          registrationStatus: race.registrationStatus,
          raceStatus: race.raceStatus,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return apiError(error, 'Nie udało się odświeżyć dostępności miejsc.')
  }
}
