import Link from 'next/link'
import { formatRaceDate, formatRaceTime } from '@/lib/dates'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { RaceRegistrationWidget } from '@/components/RaceRegistrationWidget'
import { AdminRaceStewardBar } from '@/components/AdminRaceStewardBar'
import { RacePhoto } from '@/components/RacePhoto'
import { Countdown } from '@/components/Countdown'
import { Circuit } from '@/components/Circuit'
export const dynamic = 'force-dynamic'
export default async function RaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const raceRes = await payload.find({
    collection: 'races',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    limit: 1,
  })
  const race = raceRes.docs[0]
  if (!race) notFound()
  const viewer = await getCurrentUser()
  const [regRes, resultsRes] = await Promise.all([
    payload.find({
      collection: 'registrations',
      where: { race: { equals: race.id } },
      depth: 1,
      pagination: false,
      sort: 'registeredAt',
    }),
    payload.find({
      collection: 'results',
      where: { and: [{ race: { equals: race.id } }, { status: { equals: 'published' } }] },
      depth: 0,
      limit: 1,
    }),
  ])
  const acceptedDrivers = regRes.docs.filter((r) => r.status === 'accepted')
  const pendingDrivers = regRes.docs.filter((r) => r.status === 'pending')
  const isNurburgring = race.slug === 'nurburgring-gt3'
  const status =
    race.raceStatus === 'completed'
      ? 'Wyścig zakończony'
      : race.registrationStatus === 'open'
        ? 'Zapisy otwarte'
        : 'Zapisy zamknięte'
  return (
    <div className="event-page">
      <section className="event-hero">
        <RacePhoto
          scene={isNurburgring ? 'night' : 'nurburgring'}
          priority
          className="event-backdrop"
        />
        <div className="page-width event-hero-content">
          <Link className="event-back" href="/calendar">
            Kalendarz
          </Link>
          <div className="event-hero-title" data-hero-reveal>
            <p className="event-round">
              Runda {race.round} · {race.season}
            </p>
            <h1>{race.name.replace(/^Runda \d+ - /, '')}</h1>
            <p>
              {race.trackCountry} {race.trackLength && `· ${race.trackLength}`}
            </p>
            <span
              className={`event-status ${race.raceStatus !== 'completed' && race.registrationStatus === 'open' ? 'is-open' : ''}`}
            >
              {status}
            </span>
          </div>
          <div className="event-facts">
            <div>
              <span>Start</span>
              <strong>{formatRaceDate(race.date)}</strong>
              <span>{formatRaceTime(race.date)}</span>
            </div>
            <div>
              <span>Symulator</span>
              <strong>{race.game}</strong>
            </div>
            <div>
              <span>Format</span>
              <strong>{race.format || 'Format zostanie podany w briefingu'}</strong>
            </div>
          </div>
        </div>
        {!isNurburgring && (
          <span className="photo-context">Fotografia GT3 z Nürburgringu · ilustracja ligi</span>
        )}
      </section>
      <div className="page-width event-body">
        {viewer?.role === 'admin' && (
          <AdminRaceStewardBar
            raceId={race.id}
            pendingList={pendingDrivers.map((r) => ({
              id: r.id,
              driverName: typeof r.user === 'object' ? r.user.name : 'Kierowca',
              carModel: r.carModel,
              racingNumber: r.racingNumber,
              status: r.status,
            }))}
          />
        )}
        <div className="event-columns">
          <div className="event-information">
            {isNurburgring && <Circuit />}
            {race.raceStatus === 'upcoming' && <Countdown date={race.date} />}
            <section className="event-brief" data-reveal>
              <h2>Briefing zawodów</h2>
              <p>{race.brief || 'Briefing zostanie opublikowany przed startem.'}</p>
              {race.weather && (
                <div className="event-weather">
                  <span>Warunki sesji</span>
                  <strong>{race.weather}</strong>
                </div>
              )}
            </section>
          </div>
          <section id="registration" className="registration-column">
            <RaceRegistrationWidget
              key={race.slug}
              raceSlug={race.slug}
              registrationStatus={race.registrationStatus}
              raceStatus={race.raceStatus}
              maxParticipants={race.maxParticipants}
              acceptedCount={acceptedDrivers.length}
              serverPassword={
                viewer &&
                (viewer.role === 'admin' ||
                  acceptedDrivers.some(
                    (r) =>
                      String(typeof r.user === 'object' ? r.user.id : r.user) === String(viewer.id),
                  ))
                  ? race.serverPassword
                  : undefined
              }
            />
          </section>
        </div>
        <section className="starting-grid" data-reveal>
          <div className="section-heading">
            <h2>Lista startowa</h2>
            <span>
              {acceptedDrivers.length} / {race.maxParticipants} kierowców
            </span>
          </div>
          {!acceptedDrivers.length ? (
            <p className="empty-state">Brak zaakceptowanych zgłoszeń.</p>
          ) : (
            <div className="grid-drivers">
              {acceptedDrivers.map((reg) => {
                const driver = typeof reg.user === 'object' ? reg.user : null
                return (
                  <article className="grid-driver" key={reg.id}>
                    <span className="grid-number">#{reg.racingNumber}</span>
                    <div>
                      <h3>{driver?.name || 'Kierowca'}</h3>
                      <span>{driver?.team || 'Kierowca niezależny'}</span>
                    </div>
                    <span className="grid-car">{reg.carModel}</span>
                    <span className="grid-confirmed">Potwierdzony</span>
                  </article>
                )
              })}
            </div>
          )}
        </section>
        <section className="event-regulations" data-reveal>
          <h2>Regulamin szczególny rundy</h2>
          <p>
            {race.regulations ||
              'Obowiązuje ogólny kodeks sportowy ligi. Kary i protesty rozpatrują stewardzi po zakończeniu wyścigu.'}
          </p>
          {resultsRes.docs.length > 0 && (
            <Link className="button-primary" href={`/results/${race.slug}`}>
              Wyniki wyścigu
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}
