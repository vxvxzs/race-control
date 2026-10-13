import Link from '@/components/AppLink'
import { resultRaces } from '@/lib/result-view'
import { activeSeason, championshipResults } from '@/lib/season'
import { getPayloadClient } from '@/lib/payload'
import { calculateChampionshipStandings } from '@/lib/standings'
import { formatRaceDate, formatRaceTime } from '@/lib/dates'
import { Countdown } from '@/components/Countdown'
import { HeroRegistration } from '@/components/HeroRegistration'
import { RacePhoto } from '@/components/RacePhoto'
import { Schedule } from '@/components/Schedule'
import { getScheduleState } from '@/lib/schedule'
import { AnimatedNumber } from '@/components/Motion'
export const dynamic = 'force-dynamic'
export default async function HomePage() {
  const payload = await getPayloadClient()
  const [racesRes, resultsRes, announcementsRes] = await Promise.all([
    payload.find({
      collection: 'races',
      where: { and: [{ isPublished: { equals: true } }, { season: { equals: activeSeason } }] },
      sort: 'date',
      pagination: false,
    }),
    payload.find({
      collection: 'results',
      where: championshipResults,
      depth: 2,
      pagination: false,
    }),
    payload.find({
      collection: 'announcements',
      where: { date: { less_than_equal: new Date().toISOString() } },
      sort: '-date',
      limit: 3,
    }),
  ])
  const races = racesRes.docs
  const scheduleState = await getScheduleState(payload, races)
  const upcoming = races.find(
    (r) => r.raceStatus === 'upcoming' && Date.parse(r.date) >= Date.now(),
  )
  const standings = calculateChampionshipStandings(resultRaces(resultsRes.docs)).slice(0, 5)
  return (
    <div className="home-page">
      <section className="race-hero home-hero">
        <div className="hero-image" data-hero-reveal>
          <RacePhoto priority sizes="(max-width: 640px) 100vw, 75vw" />
        </div>
        <div className="page-width hero-inner">
          <div className="hero-title" data-hero-reveal>
            <h1>
              GT3 Sprint
              <br />
              <em>Series.</em>
            </h1>
            <p>Sezon {activeSeason}</p>
          </div>
          <div className="hero-event" data-hero-reveal data-delay="100">
            {upcoming ? (
              <>
                <p className="event-round">Najbliższy wyścig · Runda {upcoming.round}</p>
                <h2>{upcoming.track}</h2>
                <p className="hero-date">
                  {formatRaceDate(upcoming.date)} · {formatRaceTime(upcoming.date)}
                </p>
              </>
            ) : (
              <p>Kalendarz następnego sezonu pojawi się tutaj.</p>
            )}
            <HeroRegistration
              slug={upcoming?.slug ?? null}
              initial={
                upcoming
                  ? {
                      acceptedCount: scheduleState[upcoming.id]?.accepted ?? 0,
                      maxParticipants: upcoming.maxParticipants,
                      registrationStatus: upcoming.registrationStatus,
                      raceStatus: upcoming.raceStatus,
                    }
                  : null
              }
            />
          </div>
          {upcoming && (
            <div className="hero-clock" data-hero-reveal data-delay="240">
              <Countdown date={upcoming.date} />
            </div>
          )}
        </div>
      </section>
      <section className="season-band">
        <div className="page-width">
          <div className="section-heading">
            <h2>Kalendarz sezonu</h2>
            <Link className="text-link" href="/calendar">
              Wszystkie wydarzenia
            </Link>
          </div>
          <Schedule races={races} state={scheduleState} />
        </div>
      </section>
      <section className="page-width home-paddock">
        <div className="home-classification" data-reveal>
          <div className="section-heading">
            <h2>Klasyfikacja kierowców</h2>
            <Link href="/standings" className="text-link">
              Pełna tabela
            </Link>
          </div>
          {standings[0] && (
            <div className="leader-feature">
              <span className="leader-position" aria-label="Pozycja 1">
                1
              </span>
              <div>
                <span className="leader-team">{standings[0].team}</span>
                <h3>{standings[0].driverName}</h3>
                <span>
                  #{standings[0].racingNumber} · {standings[0].wins}{' '}
                  {standings[0].wins === 1 ? 'zwycięstwo' : 'zwycięstw'}
                </span>
              </div>
              <strong>
                <AnimatedNumber value={standings[0].totalPoints} />
                <small>pkt</small>
              </strong>
            </div>
          )}
          <div className="leaderboard">
            {standings.slice(1).map((d) => (
              <div className="leaderboard-row" key={d.driverId}>
                <span className="rank">{d.rank}</span>
                <div>
                  <strong>{d.driverName}</strong>
                  <small>{d.team}</small>
                </div>
                <span className="muted driver-number">#{d.racingNumber || '—'}</span>
                <strong className="points">
                  <AnimatedNumber value={d.totalPoints} />
                  <small>pkt</small>
                </strong>
              </div>
            ))}
          </div>
          {!standings.length && <p className="empty-state">Brak opublikowanych wyników.</p>}
        </div>
        <aside className="paddock-news">
          <h2>Komunikaty sędziowskie</h2>
          {announcementsRes.docs.map((a) => (
            <article key={a.id}>
              <time dateTime={a.date}>{formatRaceDate(a.date)}</time>
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
            </article>
          ))}
          {!announcementsRes.docs.length && <p className="muted">Brak komunikatów.</p>}
        </aside>
      </section>
    </div>
  )
}
