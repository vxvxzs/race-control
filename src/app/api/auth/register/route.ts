export const maxDuration = 60
import { flushMail } from '@/lib/serverless-mail'
import { apiError } from '@/lib/api-error'
import { issueVerification } from '@/lib/verification'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, confirmPassword, racingNumber, team, favoriteCar } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Imię i nazwisko lub pseudonim kierowcy jest wymagany (min. 2 znaki).' },
        { status: 400 },
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Podaj poprawny adres e-mail.' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 10) {
      return NextResponse.json(
        { error: 'Hasło musi zawierać co najmniej 10 znaków.' },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Hasła nie są identyczne.' }, { status: 400 })
    }

    if (
      [team, favoriteCar].some(
        (value) => value != null && (typeof value !== 'string' || value.length > 200),
      ) ||
      name.length > 100 ||
      email.length > 254 ||
      password.length > 128
    )
      return NextResponse.json({ error: 'Nieprawidłowe dane profilu.' }, { status: 400 })

    const payload = await getPayloadClient()

    // Check if user already exists
    const existing = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email.toLowerCase().trim(),
        },
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        { error: 'Kierowca z tym adresem e-mail jest już zarejestrowany.' },
        { status: 409 },
      )
    }

    // Create new driver account
    const newUser = await payload.create({
      collection: 'users',
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'driver',
        racingNumber: racingNumber ? Number(racingNumber) : undefined,
        team: team?.trim() || undefined,
        favoriteCar: favoriteCar?.trim() || undefined,
      },
    })

    const mailId = await issueVerification(payload, newUser.id)
    if (mailId) await flushMail(payload, [mailId])

    return NextResponse.json({
      success: true,
      message:
        'Konto kierowcy zostało pomyślnie utworzone. Zaloguj się i potwierdź adres e-mail, aby zapisywać się na wyścigi.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    })
  } catch (err) {
    console.error('Registration error:', err)
    return apiError(err, 'Błąd podczas rejestracji użytkownika.')
  }
}
