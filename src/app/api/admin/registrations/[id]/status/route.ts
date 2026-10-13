import { withMailDelivery } from '@/lib/serverless-mail'
export const maxDuration = 60
import { apiError } from '@/lib/api-error'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

async function handlePOST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await getCurrentUser()
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień administratora.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, adminNote } = body

    if (!['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Nieprawidłowy status zgłoszenia.' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Find registration with related user and race
    const reg = await payload.findByID({
      collection: 'registrations',
      id,
      depth: 1,
    })

    if (!reg) {
      return NextResponse.json({ error: 'Zgłoszenie nie zostało odnalezione.' }, { status: 404 })
    }

    const updated = await payload.update({
      collection: 'registrations',
      id,
      data: {
        status,
        adminNote: adminNote !== undefined ? adminNote : reg.adminNote,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Status zgłoszenia został zmieniony na: ${status}.`,
      registration: updated,
    })
  } catch (err) {
    console.error('Admin update registration error:', err)
    return apiError(err, 'Błąd serwera.')
  }
}

export const POST = withMailDelivery(handlePOST)
