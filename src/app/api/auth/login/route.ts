import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Adres e-mail i hasło są wymagane.' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    const result = await payload.login({
      collection: 'users',
      data: {
        email: email.toLowerCase().trim(),
        password,
      },
    })

    if (!result?.token || !result?.user) {
      return NextResponse.json({ error: 'Nieprawidłowe dane logowania.' }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      message: 'Zalogowano pomyślnie.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    })

    // Set payload-token cookie
    response.cookies.set({
      name: 'payload-token',
      value: result.token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // Match the Payload token lifetime
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Nieprawidłowy adres e-mail lub hasło.' }, { status: 401 })
  }
}
