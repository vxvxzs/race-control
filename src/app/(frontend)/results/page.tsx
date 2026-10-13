import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { publishedResults } from '@/lib/season'
import { formatRaceDate } from '@/lib/dates'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Wyniki wyścigów — Race Control' }
export default async function ResultsPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'results',
    where: publishedResults,
    depth: 2,
    sort: '-publishedAt',
    pagination: false,
  })
  return (
    <div className="page-width page-content results-page">
      <header className="page-heading">
        <h1>Wyniki wyścigów</h1>
      </header>
      <div className="results-archive">
        {docs.map((result, index) => {
          const race = result.race
          if (!race || typeof race !== 'object') return null
          const classified = result.entries
            .filter((e) => e.classified !== false && e.finishStatus !== 'dsq')
            .sort((a, b) => a.position - b.position)
          const winner = classified.find((e) => e.position === 1)
          const winningDriver = typeof winner?.driver === 'object' ? winner.driver : null
          return (
            <article
              key={result.id}
              className={`archive-race ${index === 0 ? 'archive-latest' : ''}`}
            >
              <div className="archive-event">
                <span className="eyebrow">
                  Runda {race.round}
                  {index === 0 ? ' · Ostatni protokół' : ''}
                </span>
                <h2>{race.track}</h2>
                <p>
                  {formatRaceDate(race.date)} · {classified.length} sklasyfikowanych
                </p>
                <Link href={`/results/${race.slug}`} className="text-link">
                  Pełny protokół
                </Link>
              </div>
              <div className="archive-winner">
                <span className="muted">Zwycięzca wyścigu</span>
                <strong>{winningDriver?.name || 'Bez sklasyfikowanego zwycięzcy'}</strong>
                <small>{winningDriver?.team}</small>
              </div>
              <ol className="archive-podium">
                {classified
                  .filter((e) => e.position === 2 || e.position === 3)
                  .map((e) => (
                    <li key={e.id}>
                      <span>P{e.position}</span>
                      <strong>{typeof e.driver === 'object' ? e.driver.name : 'Kierowca'}</strong>
                      <small>{e.gap || '—'}</small>
                    </li>
                  ))}
              </ol>
            </article>
          )
        })}
      </div>
      {!docs.length && (
        <p className="empty-state">
          Wyniki pierwszej rundy pojawią się po zatwierdzeniu przez stewardów.
        </p>
      )}
      <Link className="text-link" href="/standings">
        Zobacz klasyfikację mistrzostw
      </Link>
    </div>
  )
}
