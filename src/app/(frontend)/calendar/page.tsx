import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { activeSeason } from '@/lib/season'
import { Schedule } from '@/components/Schedule'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Kalendarz — Race Control' }
export default async function CalendarPage() {
  const payload = await getPayloadClient()
  const { docs: races } = await payload.find({
    collection: 'races',
    where: { isPublished: { equals: true } },
    sort: 'date',
    pagination: false,
  })
  const seasons = [...new Set(races.map((r) => r.season || activeSeason))].sort((a, b) =>
    a === activeSeason ? -1 : b === activeSeason ? 1 : a.localeCompare(b),
  )
  return (
    <div className="page-width page-content calendar-page">
      <header className="page-heading">
        <h1>Kalendarz</h1>
      </header>
      {seasons.map((season) => (
        <section className="calendar-series" key={season}>
          <div className="section-heading">
            <h2>{season === activeSeason ? 'GT3 Sprint Series' : season}</h2>
            <span className="muted">{season === activeSeason ? season : ''}</span>
          </div>
          <Schedule races={races.filter((r) => (r.season || activeSeason) === season)} />
        </section>
      ))}
      {!races.length && <p className="empty-state">Brak zaplanowanych wyścigów.</p>}
      <div className="calendar-afterword">
        <h2>Przed pierwszym startem</h2>
        <p>
          Utwórz konto, potwierdź adres e-mail i wyślij zgłoszenie. Stewardzi sprawdzą je przed
          przyznaniem miejsca na serwerze.
        </p>
        <Link className="text-link" href="/rules">
          Zasady uczestnictwa
        </Link>
      </div>
    </div>
  )
}
