import { apiError } from '@/lib/api-error'
import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Zaloguj się.' }, { status: 401 })
    if (searchParams.get('userId') && searchParams.get('userId') !== String(user.id))
      return NextResponse.json({ error: 'Brak uprawnień.' }, { status: 403 })
    const userId = user.id

    if (!userId) {
      return NextResponse.json({ registration: null })
    }

    const payload = await getPayloadClient()
    const raceRes = await payload.find({
      collection: 'races',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (raceRes.docs.length === 0) {
      return NextResponse.json({ registration: null })
    }

    const race = raceRes.docs[0]
    const regRes = await payload.find({
      collection: 'registrations',
      where: {
        and: [{ race: { equals: race.id } }, { user: { equals: userId } }],
      },
      sort: '-registeredAt',
      limit: 1,
    })

    if (regRes.docs.length === 0) {
      return NextResponse.json({ registration: null })
    }

    const reg = regRes.docs[0]
    return NextResponse.json({
      registration: {
        id: reg.id,
        status: reg.status,
        carModel: reg.carModel,
        racingNumber: reg.racingNumber,
        registeredAt: reg.registeredAt,
        adminNote: reg.adminNote,
        serverPassword: reg.status === 'accepted' ? race.serverPassword : undefined,
      },
    })
  } catch (err) {
    return apiError(err, 'Błąd pobierania zgłoszenia.')
  }
}
