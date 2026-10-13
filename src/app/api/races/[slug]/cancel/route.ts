import { withMailDelivery } from '@/lib/serverless-mail'
export const maxDuration = 60
import { apiError } from '@/lib/api-error'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

async function handlePOST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
    }

    const { slug } = await params
    const payload = await getPayloadClient()

    const raceQuery = await payload.find({
      collection: 'races',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (raceQuery.docs.length === 0) {
      return NextResponse.json({ error: 'Wyścig nie istnieje.' }, { status: 404 })
    }

    const race = raceQuery.docs[0]

    if (race.registrationStatus !== 'open') {
      return NextResponse.json(
        { error: 'Nie można anulować zgłoszenia po zamknięciu zapisów.' },
        { status: 400 },
      )
    }

    const userRegistrations = await payload.find({
      collection: 'registrations',
      where: {
        and: [{ race: { equals: race.id } }, { user: { equals: user.id } }],
      },
    })

    const activeReg = userRegistrations.docs.find(
      (r) => r.status === 'pending' || r.status === 'accepted',
    )

    if (!activeReg) {
      return NextResponse.json(
        { error: 'Nie znaleziono aktywnego zgłoszenia na ten wyścig.' },
        { status: 404 },
      )
    }

    await payload.update({
      collection: 'registrations',
      id: activeReg.id,
      data: {
        status: 'cancelled',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Zgłoszenie na wyścig zostało anulowane.',
    })
  } catch (err) {
    console.error('Cancel registration error:', err)
    return apiError(err, 'Błąd podczas anulowania zgłoszenia.')
  }
}

export const POST = withMailDelivery(handlePOST)
