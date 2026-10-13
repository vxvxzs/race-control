'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
type Notice = { id: number; message: string; link?: string; read: boolean; createdAt: string }
export function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]),
    [unread, setUnread] = useState(0),
    [open, setOpen] = useState(false),
    [error, setError] = useState('')
  const wrapper = useRef<HTMLDivElement>(null)
  async function refresh() {
    try {
      const r = await fetch('/api/notifications', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      setItems(d.notifications)
      setUnread(d.unread)
      setError('')
    } catch {
      setError('Nie udało się pobrać powiadomień.')
    }
  }
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    window.addEventListener('race-control:update', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('race-control:update', refresh)
    }
  }, [])
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', key)
    }
  }, [])
  async function mark(id: number) {
    try {
      const r = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) throw new Error()
      await refresh()
    } catch {
      setError('Nie udało się oznaczyć powiadomienia.')
    }
  }
  return (
    <div className="notification-wrap" ref={wrapper}>
      <button
        className="icon-button"
        aria-label={`Powiadomienia, nieprzeczytane: ${unread}`}
        aria-expanded={open}
        aria-controls="notification-list"
        onClick={() => {
          setOpen(!open)
          refresh()
        }}
      >
        <Bell size={20} />
        {unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <section id="notification-list" className="notification-panel" aria-label="Powiadomienia">
          <div className="section-heading">
            <h2>Powiadomienia</h2>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Zamknij powiadomienia"
            >
              <X size={18} />
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {!items.length && (
            <p className="muted">
              Nie masz jeszcze powiadomień. Tutaj pojawią się decyzje stewardów i wyniki.
            </p>
          )}
          {items.map((item) => (
            <article className={`notice ${item.read ? '' : 'notice-unread'}`} key={item.id}>
              <p>{item.message}</p>
              <time>
                {new Date(item.createdAt).toLocaleString('pl-PL', {
                  timeZone: 'Europe/Warsaw',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <div className="notice-actions">
                {item.link && <Link href={item.link}>Zobacz</Link>}
                {!item.read && (
                  <button
                    onClick={() => mark(item.id)}
                    aria-label={`Oznacz jako przeczytane: ${item.message}`}
                  >
                    <Check size={15} /> Przeczytane
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
