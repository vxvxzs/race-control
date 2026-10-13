import { resultRaces } from '@/lib/result-view'
import { championshipResults } from '@/lib/season'
import React from 'react'
import { getPayloadClient } from '@/lib/payload'
import { calculateChampionshipStandings } from '@/lib/standings'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kierowcy ligi — RACE CONTROL',
  description:
    'Lista zarejestrowanych zawodników, zespoły, numery startowe oraz statystyki kierowców.',
}

export default async function DriversPage() {
  const payload = await getPayloadClient()

  const driversRes = await payload.find({
    collection: 'users',
    where: { and: [{ role: { equals: 'driver' } }, { publicProfile: { not_equals: false } }] },
    sort: 'name',
    limit: 100,
  })

  const resultsRes = await payload.find({
    collection: 'results',
    where: championshipResults,
    depth: 2,
    limit: 50,
  })

  const racesWithResults = resultRaces(resultsRes.docs)

  const standings = calculateChampionshipStandings(racesWithResults)
  const standingsMap = new Map(standings.map((s) => [String(s.driverId), s]))

  return (
    <div className="page-width page-content roster-page">
      <header className="page-heading">
        <h1>Kierowcy</h1>
        <p>{driversRes.docs.length} kierowców w lidze.</p>
      </header>
      <div className="roster-head">
        <span>Kierowca / zespół</span>
        <span>Samochód</span>
        <span>Pozycja</span>
        <span>Punkty</span>
      </div>
      <div className="roster-list">
        {driversRes.docs.map((driver) => {
          const stats = standingsMap.get(String(driver.id))
          return (
            <article key={driver.id} className="roster-row">
              <span className="roster-number">{driver.racingNumber || '—'}</span>
              <div className="roster-driver">
                <h2>{driver.name}</h2>
                <small>{driver.team || 'Kierowca niezależny'}</small>
              </div>
              <span className="roster-car">{driver.favoriteCar || 'Samochód nie wybrany'}</span>
              <span className="roster-rank">{stats ? `P${stats.rank}` : '—'}</span>
              <strong className="roster-points">
                {stats?.totalPoints || 0}
                <small> pkt</small>
              </strong>
            </article>
          )
        })}
      </div>
      <p className="roster-note">Pozycje i punkty obejmują opublikowane wyniki bieżącego sezonu.</p>
    </div>
  )
}
