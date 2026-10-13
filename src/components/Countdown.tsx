'use client'
import { useEffect, useState } from 'react'
import { countdownParts } from '@/lib/countdown'

export function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [date])
  const parts = now === null ? null : countdownParts(date, now)
  return (
    <div className="countdown" aria-label="Odliczanie do startu" role="timer">
      {parts?.started ? (
        <p className="countdown-ended">Termin startu minął</p>
      ) : (
        <>
          <span className="countdown-label">Do startu</span>
          <div className="countdown-digits" aria-hidden="true">
            {(['days', 'hours', 'minutes', 'seconds'] as const).map((key, i) => (
              <div key={key}>
                <strong>{parts ? String(parts[key]).padStart(2, '0') : '—'}</strong>
                <span>{['dni', 'godz.', 'min', 'sek.'][i]}</span>
              </div>
            ))}
          </div>
          <span className="sr-only">
            {parts
              ? `${parts.days} dni, ${parts.hours} godzin, ${parts.minutes} minut`
              : 'Obliczanie czasu do startu'}
          </span>
        </>
      )}
    </div>
  )
}
