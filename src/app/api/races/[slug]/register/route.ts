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
      return NextResponse.json(
        { error: 'Musisz być zalogowany, aby zapisać się na wyścig.' },
        { status: 401 },
      )
    }

    if (!user.emailVerified)
      return NextResponse.json(
        { error: 'Potwierdź adres e-mail w panelu kierowcy przed zapisem.' },
        { status: 403 },
      )
    const { slug } = await params
    const body = await req.json()
    const { carModel, racingNumber } = body

    if (typeof carModel !== 'string' || carModel.trim().length < 2 || carModel.length > 120) {
      return NextResponse.json({ error: 'Wybór samochodu jest wymagany.' }, { status: 400 })
    }

    const finalRacingNumber = racingNumber
      ? Number(racingNumber)
      : user.racingNumber || Math.floor(Math.random() * 899) + 100

    if (!Number.isInteger(finalRacingNumber) || finalRacingNumber < 1 || finalRacingNumber > 999)
      return NextResponse.json({ error: 'Wybierz numer startowy od 1 do 999.' }, { status: 400 })

    const payload = await getPayloadClient()

    const raceQuery = await payload.find({
      collection: 'races',
      where: {
        slug: {
          equals: slug,
        },
      },
      limit: 1,
    })

    if (raceQuery.docs.length === 0) {
      return NextResponse.json(
        { error: 'Wyścig o podanym identyfikatorze nie istnieje.' },
        { status: 404 },
      )
    }

    const race = raceQuery.docs[0]

    if (!race.isPublished || race.registrationStatus !== 'open') {
      return NextResponse.json(
        { error: 'Zapisy na ten wyścig są aktualnie zamknięte.' },
        { status: 400 },
      )
    }

    if (race.raceStatus === 'completed') {
      return NextResponse.json({ error: 'Ten wyścig został już zakończony.' }, { status: 400 })
    }

    const existingRegistrations = await payload.find({
      collection: 'registrations',
      where: {
        and: [
          {
            race: {
              equals: race.id,
            },
          },
          {
            user: {
              equals: user.id,
            },
          },
        ],
      },
    })

    const activeReg = existingRegistrations.docs.find(
      (r) => r.status === 'pending' || r.status === 'accepted',
    )

    if (activeReg) {
      return NextResponse.json(
        {
          error: `Posiadasz już aktywne zgłoszenie na ten wyścig (status: ${
            activeReg.status === 'accepted' ? 'Zaakceptowano' : 'Oczekuje na weryfikację'
          }).`,
          existingStatus: activeReg.status,
        },
        { status: 409 },
      )
    }

    const acceptedCount = await payload.count({
      collection: 'registrations',
      where: {
        and: [
          {
            race: {
              equals: race.id,
            },
          },
          {
            status: {
              equals: 'accepted',
            },
          },
        ],
      },
    })

    if (acceptedCount.totalDocs >= race.maxParticipants) {
      return NextResponse.json(
        { error: 'Wszystkie miejsca na ten wyścig zostały już zajęte.' },
        { status: 400 },
      )
    }

    const registration = await payload.create({
      collection: 'registrations',
      data: {
        user: user.id,
        race: race.id,
        status: 'pending',
        carModel: carModel.trim(),
        racingNumber: finalRacingNumber,
        registeredAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message:
        'Zgłoszenie zostało pomyślnie wysłane i oczekuje na zatwierdzenie przez administratora.',
      registration: {
        id: registration.id,
        status: registration.status,
        carModel: registration.carModel,
        racingNumber: registration.racingNumber,
        registeredAt: registration.registeredAt,
      },
    })
  } catch (err) {
    console.error('Race registration error:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    })
    return apiError(err, 'Błąd podczas przetwarzania zgłoszenia.')
  }
}

export const POST = withMailDelivery(handlePOST)
