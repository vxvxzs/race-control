import type { Result } from '@/payload-types'
export function Podium({ entries }: { entries: Result['entries'] }) {
  const podium = entries
    .filter(
      (e) =>
        e.classified !== false && e.finishStatus !== 'dsq' && e.position >= 1 && e.position <= 3,
    )
    .sort((a, b) => a.position - b.position)
  if (!podium.length) return null
  return (
    <ol className="race-podium" aria-label="Podium wyścigu" data-reveal>
      {podium.map((entry) => {
        const driver = typeof entry.driver === 'object' ? entry.driver : null
        return (
          <li
            key={entry.id || entry.position}
            className={`podium-place podium-place-${entry.position}`}
          >
            <span className="podium-position">P{entry.position}</span>
            <div className="podium-driver">
              {entry.position === 1 && <span className="podium-winner-label">Zwycięzca</span>}
              <strong>{driver?.name || 'Kierowca'}</strong>
              <span>{driver?.team || 'Kierowca niezależny'}</span>
            </div>
            <span className="podium-gap">{entry.gap || '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
