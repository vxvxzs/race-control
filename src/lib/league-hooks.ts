import { serverURL } from './server-url'
import { createHash } from 'node:crypto'
import {
  APIError,
  type CollectionBeforeValidateHook,
  type CollectionAfterChangeHook,
} from 'payload'
const idOf = (value: any) => (typeof value === 'object' ? value?.id : value)
export const validateRound: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  context,
}) => {
  if (!data || context.statusOnly) return data
  const season = data.season || originalDoc?.season || '2026/2027'
  const round = data.round ?? originalDoc?.round
  if (!Number.isInteger(round) || round < 1)
    throw new APIError('Numer rundy musi być dodatnią liczbą całkowitą.', 400)
  // Legacy duplicates remain readable, but any future write must resolve the conflict.
  const matches = await req.payload.find({
    collection: 'races',
    req,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { round: { equals: round } },
        { or: [{ season: { equals: season } }, { season: { exists: false } }] },
        ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
  })
  if (matches.totalDocs) throw new APIError(`Runda ${round} już istnieje w sezonie ${season}.`, 409)
  data.season = season
  data.roundKey = `${season}:${round}`
  return data
}
export const validateRegistration: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
  context,
}) => {
  if (!data || context.migrationImport) return data
  const driverId = idOf(data.user ?? originalDoc?.user)
  const raceId = idOf(data.race ?? originalDoc?.race)
  const status = data.status ?? originalDoc?.status ?? 'pending'
  const race = await req.payload.findByID({ collection: 'races', id: raceId, req, depth: 0 })
  const driver = await req.payload.findByID({ collection: 'users', id: driverId, req, depth: 0 })
  if (
    operation === 'create' &&
    (!driver.emailVerified ||
      !race.isPublished ||
      race.registrationStatus !== 'open' ||
      race.raceStatus === 'completed')
  )
    throw new APIError('Konto wymaga weryfikacji lub zapisy są zamknięte.', 403)
  if (status === 'pending' || status === 'accepted') {
    const duplicate = await req.payload.find({
      collection: 'registrations',
      req,
      depth: 0,
      limit: 1,
      where: {
        and: [
          { user: { equals: driverId } },
          { race: { equals: raceId } },
          { status: { in: ['pending', 'accepted'] } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
    })
    if (duplicate.totalDocs) throw new APIError('Posiadasz już aktywne zgłoszenie.', 409)
    data.activeKey = `${raceId}:${driverId}`
  } else data.activeKey = null
  if (status === 'accepted') {
    const accepted = await req.payload.find({
      collection: 'registrations',
      showHiddenFields: true,
      req,
      depth: 0,
      pagination: false,
      where: {
        and: [
          { race: { equals: raceId } },
          { status: { equals: 'accepted' } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
    })
    if (accepted.totalDocs >= race.maxParticipants)
      throw new APIError('Brak wolnych miejsc na wyścig.', 409)
    const slots = new Set(accepted.docs.map((r) => r.gridSlot).filter(Boolean))
    // Reserve a unique slot in the same DB transaction; the unique key also stops concurrent overbooking.
    let slot = 1
    while (slots.has(slot)) slot++
    if (slot > race.maxParticipants) throw new APIError('Brak wolnych miejsc na wyścig.', 409)
    data.gridSlot = slot
    data.gridKey = `${raceId}:${slot}`
  } else {
    data.gridSlot = null
    data.gridKey = null
  }
  if (!Number.isInteger(data.racingNumber ?? originalDoc?.racingNumber))
    throw new APIError('Numer startowy musi być liczbą całkowitą.', 400)
  return data
}
async function notify(
  req: any,
  recipient: any,
  key: string,
  type: string,
  message: string,
  link: string,
  email = false,
) {
  const existing = await req.payload.find({
    collection: 'notifications',
    req,
    depth: 0,
    limit: 1,
    where: { key: { equals: key } },
  })
  if (existing.totalDocs) return
  await req.payload.create({
    collection: 'notifications',
    req,
    data: { recipient: recipient.id, key, type, message, link, read: false },
  })
  if (email)
    await req.payload.create({
      collection: 'email-outbox',
      req,
      data: {
        key,
        recipient: recipient.email,
        subject: message,
        message,
        link: `${serverURL()}${link}`,
        status: 'pending',
      },
    })
}
export const registrationEvents: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if (context.skipEvents || doc.status === previousDoc?.status) return doc
  const race = await req.payload.findByID({
    collection: 'races',
    id: idOf(doc.race),
    req,
    depth: 0,
  })
  const driver = await req.payload.findByID({
    collection: 'users',
    id: idOf(doc.user),
    req,
    depth: 0,
  })
  const key = `registration:${doc.id}:${doc.updatedAt}:${doc.status}`
  const link = `/races/${race.slug}`
  if (doc.status === 'pending' || doc.status === 'cancelled') {
    const admins = await req.payload.find({
      collection: 'users',
      req,
      pagination: false,
      where: { role: { equals: 'admin' } },
    })
    for (const admin of admins.docs)
      await notify(
        req,
        admin,
        `${key}:${admin.id}`,
        `registration_${doc.status === 'pending' ? 'new' : 'cancelled'}`,
        `${driver.name}: ${doc.status === 'pending' ? 'nowe zgłoszenie' : 'anulowane zgłoszenie'} — ${race.name}`,
        link,
        doc.status === 'pending',
      )
    if (doc.status === 'pending')
      await notify(
        req,
        driver,
        `${key}:${driver.id}`,
        'registration_received',
        `Otrzymaliśmy Twoje zgłoszenie na ${race.name}. Czeka na decyzję stewardów.`,
        link,
        true,
      )
  } else if (['accepted', 'rejected'].includes(doc.status)) {
    await notify(
      req,
      driver,
      `${key}:${driver.id}`,
      `registration_${doc.status}`,
      `Twoje zgłoszenie na ${race.name} zostało ${doc.status === 'accepted' ? 'zaakceptowane' : 'odrzucone'}.${doc.adminNote ? ` ${doc.adminNote}` : ''}`,
      link,
      true,
    )
  }
  return doc
}
export const validateResults: CollectionBeforeValidateHook = ({ data }) => {
  if (!data?.entries) return data
  const drivers = new Set(),
    positions = new Set()
  for (const entry of data.entries) {
    const id = String(idOf(entry.driver))
    if (
      drivers.has(id) ||
      !Number.isInteger(entry.position) ||
      entry.position < 1 ||
      positions.has(entry.position)
    )
      throw new APIError(
        'Kierowcy i pozycje muszą być unikalni; pozycje to dodatnie liczby całkowite.',
        400,
      )
    if ((entry.penaltyPoints ?? 0) < 0) throw new APIError('Punkty karne nie mogą być ujemne.', 400)
    drivers.add(id)
    positions.add(entry.position)
  }
  return data
}
export const resultEvents: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context.skipEvents || doc.status !== 'published') return doc
  const raceId = idOf(doc.race)
  // Only change race status, bypass round validation for pre-existing conflicting round metadata.
  const race = await req.payload.update({
    collection: 'races',
    id: raceId,
    req,
    context: { statusOnly: true },
    data: { raceStatus: 'completed', registrationStatus: 'closed' },
  })
  const revision = createHash('sha256')
    .update(
      JSON.stringify(
        (doc.entries || [])
          .map((e: any) => [
            idOf(e.driver),
            e.position,
            e.finishStatus,
            e.classified !== false,
            e.penaltyPoints || 0,
            e.note || '',
            e.gap || '',
            e.bestLap || '',
          ])
          .sort((a: any, b: any) => String(a[0]).localeCompare(String(b[0]))),
      ),
    )
    .digest('hex')
  const registrations = await req.payload.find({
    collection: 'registrations',
    req,
    depth: 0,
    pagination: false,
    where: { and: [{ race: { equals: raceId } }, { status: { equals: 'accepted' } }] },
  })
  const driverIds = new Set([
    ...registrations.docs.map((r) => idOf(r.user)),
    ...(doc.entries || []).map((e: any) => idOf(e.driver)),
  ])
  for (const id of driverIds) {
    const driver = await req.payload.findByID({ collection: 'users', id, req, depth: 0 })
    await notify(
      req,
      driver,
      `results:${doc.id}:${revision}:${id}`,
      'results_published',
      `Wyniki ${race.name} są dostępne. Sprawdź swój rezultat i klasyfikację.`,
      `/results/${race.slug}`,
    )
  }
  return doc
}
