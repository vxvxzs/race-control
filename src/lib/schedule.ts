import type { Payload } from 'payload'
import type { Race } from '@/payload-types'
import { publishedResults } from './season'

export type ScheduleState = Record<string, { accepted: number; published: boolean }>

// Batch the calendar reads; pending applications do not reserve a grid place.
export async function getScheduleState(payload: Payload, races: Race[]): Promise<ScheduleState> {
  if (!races.length) return {}
  const raceFilter = { race: { in: races.map((race) => race.id) } }
  const [registrations, results] = await Promise.all([
    payload.find({
      collection: 'registrations',
      where: { and: [raceFilter, { status: { equals: 'accepted' } }] },
      depth: 0,
      pagination: false,
      select: { race: true },
    }),
    payload.find({
      collection: 'results',
      where: { and: [raceFilter, publishedResults] },
      depth: 0,
      pagination: false,
      select: { race: true },
    }),
  ])
  const state: ScheduleState = Object.fromEntries(
    races.map((race) => [race.id, { accepted: 0, published: false }]),
  )
  for (const registration of registrations.docs) {
    const id = typeof registration.race === 'object' ? registration.race.id : registration.race
    if (state[id]) state[id].accepted++
  }
  for (const result of results.docs) {
    const id = typeof result.race === 'object' ? result.race.id : result.race
    if (state[id]) state[id].published = true
  }
  return state
}
