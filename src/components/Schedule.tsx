import { RaceButton } from './RaceButton'
import type { ScheduleState } from '@/lib/schedule'
import Link from '@/components/AppLink'
import type { Race } from '@/payload-types'
import { formatRaceTime } from '@/lib/dates'
export function Schedule({ races, state }: { races: Race[]; state: ScheduleState }) {
  return (
    <div className="schedule-list">
      {races.map((r) => {
        const date = new Date(r.date)
        const completed = r.raceStatus === 'completed'
        const published = state[r.id]?.published === true
        const full = (state[r.id]?.accepted ?? 0) >= r.maxParticipants
        const open = !completed && r.registrationStatus === 'open' && !full
        return (
          <div className={`schedule-row ${completed ? 'is-completed' : ''}`} key={r.id}>
            <time dateTime={r.date} className="schedule-date">
              <strong>
                {new Intl.DateTimeFormat('pl-PL', {
                  day: '2-digit',
                  timeZone: 'Europe/Warsaw',
                }).format(date)}
              </strong>
              <span>
                {new Intl.DateTimeFormat('pl-PL', {
                  month: 'short',
                  timeZone: 'Europe/Warsaw',
                }).format(date)}{' '}
                {date.getUTCFullYear()}
              </span>
            </time>
            <Link href={`/races/${r.slug}`} className="schedule-track">
              <h3>{r.track}</h3>
              <span>
                {r.trackCountry} · {r.game === 'Assetto Corsa Competizione' ? 'ACC' : r.game}
              </span>
            </Link>
            <span className="schedule-round">Runda {r.round}</span>
            <span className="schedule-time">{formatRaceTime(r.date)}</span>
            <div className="schedule-action">
              {completed && published ? (
                <RaceButton variant="outline" href={`/results/${r.slug}`}>
                  Wyniki
                </RaceButton>
              ) : open ? (
                <RaceButton href={`/races/${r.slug}#registration`}>Zapisz się</RaceButton>
              ) : (
                <span className="schedule-closed">
                  {completed
                    ? 'Wyniki w przygotowaniu'
                    : full && r.registrationStatus === 'open'
                      ? 'Lista startowa pełna'
                      : 'Zapisy zamknięte'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
