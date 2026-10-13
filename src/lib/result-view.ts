import type { Result } from '@/payload-types'
import type { RaceWithResult } from './standings'

// A single projection for all standings views; populated relationships stay server-side.
export function resultRaces(results: Result[]): (RaceWithResult & { slug: string })[] {
  return results.flatMap((result) => {
    const race = typeof result.race === 'object' ? result.race : null
    if (!race) return []
    return [
      {
        raceId: String(race.id),
        raceName: race.name,
        slug: race.slug,
        round: race.round,
        track: race.track,
        date: race.date,
        status: result.status,
        entries: result.entries.map((entry) => {
          const driver = typeof entry.driver === 'object' ? entry.driver : null
          return {
            driverId: String(driver?.id ?? entry.driver),
            driverName: driver?.name || 'Kierowca',
            team: driver?.team || undefined,
            racingNumber: driver?.racingNumber ?? undefined,
            position: entry.position,
            finishStatus: entry.finishStatus,
            classified: entry.classified !== false,
            penaltyPoints: entry.penaltyPoints ?? 0,
          }
        }),
      },
    ]
  })
}
