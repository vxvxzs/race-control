import { resultRaces } from '@/lib/result-view'
import type { CareerRegistration } from '@/lib/career'
import { championshipResults } from '@/lib/season'
import React from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import { calculateChampionshipStandings, calculateEntryPoints } from '@/lib/standings'
import { DriverAccountDashboard } from '@/components/DriverAccountDashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Panel kierowcy — RACE CONTROL',
  description:
    'Zarządzaj swoimi zgłoszeniami do wyścigów, sprawdź statusy weryfikacji i profil kierowcy.',
}

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=/account')
  }

  const payload = await getPayloadClient()

  const regRes = await payload.find({
    collection: 'registrations',
    where: {
      user: { equals: user.id },
    },
    depth: 2,
    sort: '-registeredAt',
    limit: 50,
  })

  const formattedRegs: CareerRegistration[] = regRes.docs.flatMap((r) => {
    const raceObj = typeof r.race === 'object' ? r.race : null
    if (!raceObj) return []
    return [
      {
        id: r.id,
        status: r.status,
        carModel: r.carModel,
        racingNumber: r.racingNumber,
        registeredAt: r.registeredAt,
        adminNote: r.adminNote,
        race: {
          id: raceObj.id,
          name: raceObj.name,
          slug: raceObj.slug,
          round: raceObj.round,
          track: raceObj.track,
          date: raceObj.date,
          registrationStatus: raceObj.registrationStatus,
          raceStatus: raceObj.raceStatus,
          serverPassword: r.status === 'accepted' ? raceObj.serverPassword : undefined,
        },
      },
    ]
  })

  const resultsRes = await payload.find({
    collection: 'results',
    where: championshipResults,
    depth: 2,
    limit: 50,
  })

  const racesWithResults = resultRaces(resultsRes.docs)

  const allStandings = calculateChampionshipStandings(racesWithResults)
  const userStanding = allStandings.find((s) => String(s.driverId) === String(user.id)) || null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <DriverAccountDashboard
        user={{
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          racingNumber: user.racingNumber,
          team: user.team,
          favoriteCar: user.favoriteCar,
          steamId: user.steamId,
          bio: user.bio,
          emailVerified: user.emailVerified,
        }}
        results={racesWithResults.flatMap((res) => {
          const entry = res.entries?.find((e) => e.driverId === String(user.id))
          return entry
            ? [
                {
                  raceId: res.raceId,
                  name: res.track,
                  slug: res.slug,
                  position: entry.position,
                  status: entry.finishStatus,
                  points: calculateEntryPoints(
                    entry.position,
                    entry.finishStatus,
                    entry.penaltyPoints,
                    entry.classified !== false,
                  ),
                },
              ]
            : []
        })}
        registrations={formattedRegs}
        standing={
          userStanding
            ? {
                rank: userStanding.rank,
                totalPoints: userStanding.totalPoints,
                starts: userStanding.starts,
                wins: userStanding.wins,
                podiums: userStanding.podiums,
                diffToLeader: userStanding.diffToLeader,
              }
            : null
        }
      />
    </div>
  )
}
