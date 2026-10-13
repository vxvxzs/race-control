'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
type Notice = { id: number; message: string; link?: string; createdAt: string }
export function LatestNotifications() {
  const [items, setItems] = useState<Notice[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    async function refresh() {
      if (document.hidden) return
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' })
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (active) {
          setItems(data.notifications.slice(0, 3))
          setError(false)
        }
      } catch {
        if (active) setError(true)
      }
    }
    refresh()
    const timer = setInterval(refresh, 15000)
    window.addEventListener('race-control:update', refresh)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('race-control:update', refresh)
    }
  }, [])
  return (
    <section className="career-notifications">
      <h2>Ostatnie powiadomienia</h2>
      {error && <p className="muted text-sm">Nie udało się odświeżyć powiadomień.</p>}
      {!items.length && !error && <p className="muted text-sm">Brak powiadomień.</p>}
      {items.map((item) => (
        <article className="notice" key={item.id}>
          <p>{item.message}</p>
          <time>
            {new Date(item.createdAt).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}
          </time>
          {item.link && (
            <Link className="text-link" href={item.link}>
              Zobacz szczegóły
            </Link>
          )}
        </article>
      ))}
    </section>
  )
}
