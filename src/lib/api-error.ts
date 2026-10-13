import { NextResponse } from 'next/server'
export function apiError(error: unknown, fallback: string) {
  const value = error as { status?: number; message?: string; isPublic?: boolean }
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: 'Nieprawidłowe dane żądania.' }, { status: 400 })
  if (value?.status && value.status >= 400 && value.status < 500)
    return NextResponse.json(
      { error: value.isPublic ? value.message : fallback },
      { status: value.status },
    )
  return NextResponse.json({ error: fallback }, { status: 500 })
}
