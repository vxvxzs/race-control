'use client'
import Link from '@/components/AppLink'
import { Status } from './Status'
import { AnimatedNumber } from './Motion'
import { Countdown } from './Countdown'
import { LatestNotifications } from './LatestNotifications'
import type { CareerRegistration } from '@/lib/career'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRaceDate, formatRaceTime } from '@/lib/dates'
interface Props {
  user: {
    id: string
    name: string
    email: string
    role: string
    racingNumber?: number | null
    team?: string | null
    favoriteCar?: string | null
    steamId?: string | null
    bio?: string | null
    emailVerified?: boolean | null
  }
  registrations: CareerRegistration[]
  standing?: {
    rank: number
    totalPoints: number
    starts: number
    wins: number
    podiums: number
    diffToLeader: string
  } | null
  results?: {
    raceId: string
    name: string
    slug: string
    points: number
    position: number
    status: string
  }[]
}
const labels: Record<string, string> = {
  pending: 'Oczekuje na decyzję',
  accepted: 'Zaakceptowano',
  rejected: 'Odrzucono',
  cancelled: 'Anulowano',
}
export function DriverAccountDashboard({
  user: initialUser,
  registrations: initialRegs,
  standing,
  results = [],
}: Props) {
  const [user, setUser] = useState(initialUser),
    [registrations, setRegistrations] = useState(initialRegs),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false)
  const router = useRouter()
  useEffect(() => {
    setUser(initialUser)
    setRegistrations(initialRegs)
  }, [initialUser, initialRegs])
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && !editing && !busy) router.refresh()
    }, 15000)
    return () => clearInterval(interval)
  }, [router, editing, busy])
  const next = registrations
    .filter(
      (r) =>
        r.race?.raceStatus === 'upcoming' &&
        Date.parse(r.race.date) >= Date.now() &&
        ['pending', 'accepted'].includes(r.status),
    )
    .sort((a, b) => a.race.date.localeCompare(b.race.date))[0]
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(e.currentTarget)
    const data = Object.fromEntries(form.entries())
    try {
      const r = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setUser((u) => ({ ...u, ...d.user }))
      setEditing(false)
      setError(false)
      setMessage('Dane kierowcy zapisane.')
      router.refresh()
    } catch (e) {
      setError(true)
      setMessage(e instanceof Error ? e.message : 'Błąd połączenia.')
    } finally {
      setBusy(false)
    }
  }
  async function cancel(slug: string) {
    if (!confirm('Anulować zgłoszenie na ten wyścig?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/races/${slug}/cancel`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setError(false)
      setMessage('Zgłoszenie anulowane.')
      router.refresh()
      window.dispatchEvent(new Event('race-control:update'))
    } catch (e) {
      setError(true)
      setMessage(e instanceof Error ? e.message : 'Błąd połączenia.')
    } finally {
      setBusy(false)
    }
  }
  async function resend() {
    setBusy(true)
    try {
      const r = await fetch('/api/auth/resend-verification', { method: 'POST' })
      const d = await r.json()
      setError(!r.ok)
      setMessage(
        r.ok
          ? 'Wiadomość weryfikacyjna została dodana do kolejki. Sprawdź swoją skrzynkę.'
          : d.error,
      )
    } catch {
      setError(true)
      setMessage('Błąd połączenia.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="career-page">
      <header className="career-header">
        <div
          className="career-number"
          aria-label={`Numer startowy ${user.racingNumber || 'nie nadano'}`}
        >
          {user.racingNumber || '—'}
        </div>
        <div>
          <h1>{user.name}</h1>
          <p>
            {user.team || 'Kierowca niezależny'} ·{' '}
            {user.favoriteCar || 'Wybierz samochód w profilu'}
          </p>
          <div className="career-actions">
            <button onClick={() => setEditing(!editing)}>
              {editing ? 'Zamknij edycję' : 'Edytuj profil'}
            </button>
            <Link className="text-link" href="/calendar">
              Wybierz wyścig
            </Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="text-link">
                Panel stewardów
              </Link>
            )}
          </div>
        </div>
      </header>
      {message && (
        <div role={error ? 'alert' : 'status'} className="verification-banner">
          {message}
        </div>
      )}
      {!user.emailVerified && (
        <div className="verification-banner">
          <strong>Potwierdź swój adres e-mail</strong>
          <p>
            Wysłaliśmy link na {user.email}. Do czasu weryfikacji możesz przeglądać konto, ale
            zgłoszenia na wyścigi są zablokowane.
          </p>
          <button onClick={resend} disabled={busy}>
            Wyślij link ponownie
          </button>
        </div>
      )}
      {editing && (
        <form onSubmit={save} className="career-profile">
          {[
            ['name', 'Nazwa kierowcy', user.name],
            ['racingNumber', 'Numer startowy', user.racingNumber],
            ['team', 'Zespół', user.team],
            ['favoriteCar', 'Samochód', user.favoriteCar],
            ['steamId', 'Steam ID / ACC GUID', user.steamId],
            ['bio', 'O kierowcy', user.bio],
          ].map(([key, label, value]) => (
            <label key={key} htmlFor={`profile-${key}`}>
              {label}
              <input
                id={`profile-${key}`}
                name={String(key)}
                defaultValue={String(value || '')}
                type={key === 'racingNumber' ? 'number' : 'text'}
                min={key === 'racingNumber' ? 1 : undefined}
                max={key === 'racingNumber' ? 999 : undefined}
                required={key === 'name'}
                maxLength={key === 'bio' ? 1000 : 200}
              />
            </label>
          ))}
          <div className="full">
            <button className="button-primary" disabled={busy}>
              {busy ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      )}
      <section className="career-stats" aria-label="Dorobek w sezonie">
        {[
          ['Pozycja w mistrzostwach', standing ? `P${standing.rank}` : '—'],
          ['Punkty', standing?.totalPoints || 0],
          ['Starty / podia', `${standing?.starts || 0} / ${standing?.podiums || 0}`],
          ['Zwycięstwa', standing?.wins || 0],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</strong>
          </div>
        ))}
      </section>
      <div className="career-content">
        <section>
          <h2>Twoje zgłoszenia</h2>
          {next && (
            <article className="career-race">
              <span className="eyebrow">Najbliższy start · Runda {next.race.round}</span>
              <h3>{next.race.track}</h3>
              <p>
                {formatRaceDate(next.race.date)} · {formatRaceTime(next.race.date)}
              </p>
              <Status
                className="career-status"
                state={
                  next.status === 'accepted'
                    ? 'confirmed'
                    : next.status === 'pending'
                      ? 'pending'
                      : 'neutral'
                }
              >
                {labels[next.status]}
              </Status>
              <Countdown date={next.race.date} />
              {next.status === 'accepted' && next.race.serverPassword && (
                <p>
                  Hasło serwera: <strong className="select-all">{next.race.serverPassword}</strong>
                </p>
              )}
              <Link href={`/races/${next.race.slug}`} className="text-link">
                Otwórz wydarzenie
              </Link>
            </article>
          )}
          <div className="career-history">
            {registrations.map((r) => (
              <article key={r.id}>
                <div>
                  <h3>
                    <Link href={`/races/${r.race.slug}`}>
                      {r.race.name.replace(/^Runda \d+ - /, '')}
                    </Link>
                  </h3>
                  <p>
                    #{r.racingNumber} · {r.carModel}
                  </p>
                  <p>{formatRaceDate(r.race.date)}</p>
                  <Status
                    state={
                      r.status === 'accepted'
                        ? 'confirmed'
                        : r.status === 'pending'
                          ? 'pending'
                          : r.status === 'rejected'
                            ? 'rejected'
                            : 'neutral'
                    }
                  >
                    {labels[r.status]}
                  </Status>
                  {r.adminNote && <p>Stewardzi: {r.adminNote}</p>}
                </div>
                {r.race.registrationStatus === 'open' &&
                  r.race.raceStatus === 'upcoming' &&
                  ['pending', 'accepted'].includes(r.status) && (
                    <button disabled={busy} onClick={() => cancel(r.race.slug)}>
                      Wycofaj
                    </button>
                  )}
              </article>
            ))}
          </div>
          {!registrations.length && (
            <p className="empty-state">
              Twój sezon zaczyna się od pierwszego zgłoszenia.{' '}
              <Link href="/calendar">Znajdź swój wyścig</Link>
            </p>
          )}
        </section>
        <aside>
          <h2>Historia wyników</h2>
          {results.map((r) => (
            <Link className="career-result" href={`/results/${r.slug}`} key={r.raceId}>
              <span>
                {r.name}
                <small className="block muted">
                  P{r.position} · {r.status.toUpperCase()}
                </small>
              </span>
              <strong>{r.points} pkt</strong>
            </Link>
          ))}
          {!results.length && (
            <p className="muted text-sm">
              Po pierwszym starcie zobaczysz tu swoje oficjalne wyniki.
            </p>
          )}
          <LatestNotifications />
          <p className="muted text-xs mt-6">
            {user.emailVerified ? 'Adres e-mail potwierdzony' : 'Adres oczekuje na weryfikację'}
            <br />
            {user.email}
          </p>
        </aside>
      </div>
    </div>
  )
}
