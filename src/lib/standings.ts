export interface RaceResultEntry {
  driverId: string
  driverName: string
  team?: string
  carModel?: string
  racingNumber?: number
  position: number
  classified?: boolean
  finishStatus: 'finished' | 'dnf' | 'dsq'
  gap?: string
  bestLap?: string
  penaltyPoints?: number
  note?: string
}

export interface RaceWithResult {
  raceId: string
  raceName: string
  round: number
  track: string
  date: string
  status: 'draft' | 'published'
  entries: RaceResultEntry[]
}

export interface DriverStanding {
  rank: number
  driverId: string
  driverName: string
  team: string
  racingNumber?: number
  starts: number
  wins: number
  podiums: number
  top10: number
  dnfs: number
  dsqs: number
  totalPoints: number
  penaltyPointsTotal: number
  diffToLeader: string
  diffToNext: string
  finishes: number[] // all finish positions sorted ascending for tie-breaks
  racePoints: Record<string, { points: number; position: number; status: string }> // race ID -> result
}

export const POINTS_TABLE: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
}

export function calculateEntryPoints(
  position: number,
  finishStatus: 'finished' | 'dnf' | 'dsq',
  penaltyPoints = 0,
  classified = true,
): number {
  if (finishStatus === 'dsq' || !classified) return 0
  const basePoints = POINTS_TABLE[position] || 0
  const penalty = Math.max(0, penaltyPoints || 0)
  return Math.max(0, basePoints - penalty)
}

export function calculateChampionshipStandings(
  racesWithResults: RaceWithResult[],
): DriverStanding[] {
  const publishedRaces = racesWithResults.filter((r) => r.status === 'published')

  const driversMap = new Map<
    string,
    {
      driverId: string
      driverName: string
      team: string
      racingNumber?: number
      starts: number
      wins: number
      podiums: number
      top10: number
      dnfs: number
      dsqs: number
      totalPoints: number
      penaltyPointsTotal: number
      positions: number[]
      racePoints: Record<string, { points: number; position: number; status: string }>
    }
  >()

  for (const race of publishedRaces) {
    for (const entry of race.entries) {
      if (!entry.driverId) continue

      let driver = driversMap.get(entry.driverId)
      if (!driver) {
        driver = {
          driverId: entry.driverId,
          driverName: entry.driverName || 'Kierowca',
          team: entry.team || 'Prywatny',
          racingNumber: entry.racingNumber,
          starts: 0,
          wins: 0,
          podiums: 0,
          top10: 0,
          dnfs: 0,
          dsqs: 0,
          totalPoints: 0,
          penaltyPointsTotal: 0,
          positions: [],
          racePoints: {},
        }
        driversMap.set(entry.driverId, driver)
      }

      driver.starts += 1
      if (entry.finishStatus === 'dnf') {
        driver.dnfs += 1
      } else if (entry.finishStatus === 'dsq') {
        driver.dsqs += 1
      }

      if (entry.finishStatus !== 'dsq' && entry.classified !== false) {
        driver.positions.push(entry.position)
        if (entry.position === 1) driver.wins += 1
        if (entry.position <= 3) driver.podiums += 1
        if (entry.position <= 10) driver.top10 += 1
      }

      const points = calculateEntryPoints(
        entry.position,
        entry.finishStatus,
        entry.penaltyPoints || 0,
        entry.classified !== false,
      )

      driver.totalPoints += points
      driver.penaltyPointsTotal += entry.penaltyPoints || 0

      driver.racePoints[String(race.raceId)] = {
        points,
        position: entry.position,
        status: entry.finishStatus,
      }
    }
  }

  const standingsList = Array.from(driversMap.values()).map((d) => ({
    driverId: d.driverId,
    driverName: d.driverName,
    team: d.team,
    racingNumber: d.racingNumber,
    starts: d.starts,
    wins: d.wins,
    podiums: d.podiums,
    top10: d.top10,
    dnfs: d.dnfs,
    dsqs: d.dsqs,
    totalPoints: d.totalPoints,
    penaltyPointsTotal: d.penaltyPointsTotal,
    finishes: d.positions.sort((a, b) => a - b),
    racePoints: d.racePoints,
  }))

  standingsList.sort((a, b) => {
    // 1. Total points descending
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints
    }
    // 2. Wins count descending
    if (b.wins !== a.wins) {
      return b.wins - a.wins
    }
    // 3. Best positions count comparison (count of 2nd places, 3rd places, etc.)
    const positions = [...new Set([...a.finishes, ...b.finishes])]
      .filter((p) => p >= 2)
      .sort((a, b) => a - b)
    for (const pos of positions) {
      const aCount = a.finishes.filter((p) => p === pos).length
      const bCount = b.finishes.filter((p) => p === pos).length
      if (bCount !== aCount) {
        return bCount - aCount
      }
    }
    // 4. Alphabetical by driver name
    return (
      a.driverName.localeCompare(b.driverName, 'pl') ||
      String(a.driverId).localeCompare(String(b.driverId))
    )
  })

  const leaderPoints = standingsList.length > 0 ? standingsList[0].totalPoints : 0

  return standingsList.map((driver, index) => {
    const rank = index + 1
    const diffToLeader = rank === 1 ? '—' : `-${leaderPoints - driver.totalPoints}`
    const prevDriver = index > 0 ? standingsList[index - 1] : null
    const diffToNext = prevDriver ? `-${prevDriver.totalPoints - driver.totalPoints}` : '—'

    return {
      rank,
      ...driver,
      diffToLeader,
      diffToNext,
    }
  })
}
