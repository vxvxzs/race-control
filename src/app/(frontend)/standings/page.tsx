import Link from '@/components/AppLink'
import { resultRaces } from '@/lib/result-view'
import { AnimatedNumber, LiveStandings } from '@/components/Motion'
import { championshipResults } from '@/lib/season'
import { getPayloadClient } from '@/lib/payload'
import { calculateChampionshipStandings, POINTS_TABLE } from '@/lib/standings'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Klasyfikacja kierowców — Race Control' }
export default async function StandingsPage() {
  const payload = await getPayloadClient()
  const results = await payload.find({
    collection: 'results',
    where: championshipResults,
    depth: 2,
    pagination: false,
  })
  const races = resultRaces(results.docs).sort(
    (a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.raceId.localeCompare(b.raceId),
  )
  const standings = calculateChampionshipStandings(races)
  return (
    <LiveStandings>
      <div className="page-width page-content standings-page">
        <header className="page-heading">
          <span className="eyebrow">GT3 Sprint Series · Sezon 2026 / 27</span>
          <h1>Klasyfikacja kierowców</h1>
          <p>{races.length} rozegrane rundy · tabela mistrzostw</p>
        </header>
        {standings[0] && (
          <div className="championship-lead">
            <span>Lider mistrzostw</span>
            <strong>{standings[0].driverName}</strong>
            <b>
              {standings[0].totalPoints} <small>pkt</small>
            </b>
            {standings[1] && (
              <span>
                P2 · {standings[1].driverName} · {standings[1].diffToLeader}
              </span>
            )}
          </div>
        )}
        <div
          className="table-scroll"
          role="region"
          aria-label="Klasyfikacja, tabela przewijana poziomo"
          tabIndex={0}
        >
          <table className="standings-table">
            <caption className="sr-only">
              Klasyfikacja mistrzostw. Każda kolumna odpowiada jednemu wyścigowi.
            </caption>
            <thead>
              <tr>
                <th scope="col">Poz.</th>
                <th scope="col" className="driver-cell">
                  Kierowca
                </th>
                <th scope="col" className="total-cell">
                  Punkty
                </th>
                <th scope="col">Strata</th>
                {races.map((r) => (
                  <th key={r.raceId} scope="col">
                    <Link href={`/results/${r.slug}`}>
                      <span>R{r.round}</span>
                      <small>{r.track}</small>
                    </Link>
                  </th>
                ))}
                <th scope="col" className="stat-column">
                  Starty
                </th>
                <th scope="col" className="stat-column">
                  Wygrane
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((d) => (
                <tr
                  data-standing={`desktop-${d.driverId}`}
                  key={d.driverId}
                  className={`standing-place-${d.rank} ${d.rank === 1 ? 'leader-row' : ''}`}
                >
                  <td className="rank">{d.rank}</td>
                  <th scope="row" className="driver-cell">
                    <span className="driver-identity">
                      <span className="driver-number">#{d.racingNumber || '—'}</span>
                      <span>
                        {d.driverName}
                        <small>{d.team}</small>
                      </span>
                    </span>
                  </th>
                  <td className="total-cell">
                    <AnimatedNumber value={d.totalPoints} />
                  </td>
                  <td className="leader-gap">{d.diffToLeader}</td>
                  {races.map((r) => {
                    const result = d.racePoints[r.raceId]
                    return (
                      <td
                        key={r.raceId}
                        className={
                          result && result.status === 'finished' && result.position <= 3
                            ? `round-podium-${result.position}`
                            : ''
                        }
                        title={
                          result
                            ? `P${result.position} · ${result.status.toUpperCase()}`
                            : 'Brak startu'
                        }
                      >
                        {result ? (
                          <>
                            {result.points}
                            <small>
                              {result.status !== 'finished'
                                ? result.status.toUpperCase()
                                : `P${result.position}`}
                            </small>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}
                  <td className="stat-column">{d.starts}</td>
                  <td className="stat-column">{d.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!standings.length && (
            <p className="empty-state">Sezon czeka na pierwsze oficjalne wyniki.</p>
          )}
        </div>
        <div className="mobile-standings" aria-label="Klasyfikacja mobilna">
          {standings.map((driver) => (
            <details
              className={`standing-place-${driver.rank}`}
              data-standing={`mobile-${driver.driverId}`}
              key={driver.driverId}
            >
              <summary>
                <span className="rank">{driver.rank}</span>
                <span className="mobile-standing-name">
                  {driver.driverName}
                  <small>{driver.team}</small>
                </span>
                <strong>
                  <AnimatedNumber value={driver.totalPoints} />
                  <small>pkt</small>
                  <small className="mobile-leader-gap">{driver.diffToLeader}</small>
                </strong>
                <span className="expand-mark" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="mobile-round-results">
                <p>
                  {driver.starts} startów · {driver.wins} zwycięstw · {driver.podiums} podiów
                </p>
                {races.map((race) => {
                  const result = driver.racePoints[race.raceId]
                  return (
                    <Link href={`/results/${race.slug}`} key={race.raceId}>
                      <span>
                        R{race.round} · {race.track}
                        <small>
                          {result
                            ? `P${result.position} · ${result.status === 'finished' ? 'Meta' : result.status.toUpperCase()}`
                            : 'Brak startu'}
                        </small>
                      </span>
                      <strong>{result ? `${result.points} pkt` : '—'}</strong>
                    </Link>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
        <div className="standings-notes">
          <section>
            <h2>Punktacja</h2>
            <div className="points-scale">
              {Object.entries(POINTS_TABLE).map(([pos, pts]) => (
                <div key={pos}>
                  <small>P{pos}</small>
                  <strong>{pts}</strong>
                </div>
              ))}
            </div>
            <p>
              DNF może być sklasyfikowany i otrzymać punkty. Niesklasyfikowany zawodnik oraz DSQ
              otrzymują 0 punktów. Kary odejmujemy od wyniku rundy.
            </p>
          </section>
          <aside>
            <h3>Gdy punkty są równe</h3>
            <p>
              Decyduje liczba zwycięstw, następnie drugich, trzecich i kolejnych miejsc. Ostateczna
              kolejność jest alfabetyczna.
            </p>
            <Link className="text-link" href="/results">
              Protokoły i decyzje stewardów
            </Link>
          </aside>
        </div>
      </div>
    </LiveStandings>
  )
}
