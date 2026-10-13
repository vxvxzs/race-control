import { withMailDelivery } from '@/lib/serverless-mail'
export const maxDuration = 60
import { apiError } from '@/lib/api-error'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

async function handlePOST(req: Request, { params }: { params: Promise<{ raceId: string }> }) {
  try {
    const adminUser = await getCurrentUser()
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień administratora.' }, { status: 403 })
    }

    const { raceId } = await params
    const body = await req.json()
    const { status, entries } = body // status: 'draft' | 'published'

    if (!['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Nieprawidłowy status publikacji.' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Verify race exists
    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
    })

    if (!race) {
      return NextResponse.json({ error: 'Wyścig nie istnieje.' }, { status: 404 })
    }

    // Check if results document already exists for this race
    const existingResults = await payload.find({
      collection: 'results',
      where: {
        race: { equals: raceId },
      },
      limit: 1,
    })

    let resultDoc
    if (existingResults.docs.length > 0) {
      // Update existing
      resultDoc = await payload.update({
        collection: 'results',
        id: existingResults.docs[0].id,
        data: {
          status,
          publishedAt: status === 'published' ? new Date().toISOString() : undefined,
          entries: entries || existingResults.docs[0].entries,
        },
      })
    } else {
      // Create new
      resultDoc = await payload.create({
        collection: 'results',
        data: {
          race: race.id,
          status,
          publishedAt: status === 'published' ? new Date().toISOString() : undefined,
          entries: entries || [],
        },
      })
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'published'
          ? 'Wyniki zostały opublikowane i zaktualizowały tabelę.'
          : 'Wyniki zapisane jako wersja robocza.',
      result: { id: resultDoc.id, status: resultDoc.status },
    })
  } catch (err) {
    console.error('Publish results error:', {
      name: err instanceof Error ? err.name : 'UnknownError',
    })
    return apiError(err, 'Błąd zapisu wyników.')
  }
}

export const POST = withMailDelivery(handlePOST)
