import Link from '@/components/AppLink'
import { getPayloadClient } from '@/lib/payload'
import { publishedResults } from '@/lib/season'
import { Podium } from '@/components/Podium'
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
              <Podium entries={result.entries} />
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
