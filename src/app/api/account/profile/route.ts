import { apiError } from '@/lib/api-error'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
    }

    const body = await req.json()
    const { name, team, favoriteCar, racingNumber, bio, steamId } = body

    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.length > 100 ||
      [team, favoriteCar, bio, steamId].some(
        (value) => value != null && (typeof value !== 'string' || value.length > 1000),
      )
    ) {
      return NextResponse.json(
        { error: 'Nazwa kierowcy musi mieć co najmniej 2 znaki.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()

    const updated = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        name: name.trim(),
        team: team?.trim() || undefined,
        favoriteCar: favoriteCar?.trim() || undefined,
        racingNumber: racingNumber ? Number(racingNumber) : undefined,
        bio: bio?.trim() || undefined,
        steamId: steamId?.trim() || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Profil został zaktualizowany.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        racingNumber: updated.racingNumber,
        team: updated.team,
        favoriteCar: updated.favoriteCar,
      },
    })
  } catch (err) {
    return apiError(err, 'Błąd serwera.')
  }
}
