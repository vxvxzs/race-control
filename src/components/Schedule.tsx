import { Status } from './Status'
import Link from '@/components/AppLink'
import type { Race } from '@/payload-types'
import { formatRaceTime } from '@/lib/dates'
export function Schedule({ races }: { races: Race[] }) {
  return (
    <div className="schedule-list">
      {races.map((r) => {
        const date = new Date(r.date)
        const completed = r.raceStatus === 'completed'
        return (
          <Link
            className={`schedule-row ${completed ? 'is-completed' : ''}`}
            href={completed ? `/results/${r.slug}` : `/races/${r.slug}`}
            key={r.id}
          >
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
            <div className="schedule-track">
              <h3>{r.track}</h3>
              <span>
                {r.trackCountry} · {r.game === 'Assetto Corsa Competizione' ? 'ACC' : r.game}
              </span>
            </div>
            <span className="schedule-round">Runda {r.round}</span>
            <span className="schedule-time">{formatRaceTime(r.date)}</span>
            <Status
              className="schedule-status"
              state={completed ? 'confirmed' : r.registrationStatus === 'open' ? 'open' : 'neutral'}
            >
              {completed
                ? 'Wyniki'
                : r.registrationStatus === 'open'
                  ? 'Zapisy otwarte'
                  : 'Zapisy zamknięte'}
            </Status>
          </Link>
        )
      })}
    </div>
  )
}
