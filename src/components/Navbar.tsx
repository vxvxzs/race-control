'use client'
import type { User } from '@/payload-types'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from '@/components/AppLink'
import { Menu, X } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
export function Navbar() {
  const [user, setUser] = useState<Pick<User, 'id' | 'name' | 'role' | 'racingNumber'> | null>(
      null,
    ),
    [open, setOpen] = useState(false)
  const pathname = usePathname(),
    router = useRouter()
  useEffect(() => {
    setOpen(false)
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
  }, [pathname])
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setOpen(false)
    router.push('/')
    router.refresh()
  }
  const links = [
    ['Kalendarz', '/calendar'],
    ['Klasyfikacja', '/standings'],
    ['Wyniki', '/results'],
    ['Kierowcy', '/drivers'],
    ['Regulamin', '/rules'],
  ]
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Race Control, strona główna">
          <span className="brand-symbol">
            RC
            <span />
          </span>
          <span>RACE CONTROL</span>
        </Link>
        <nav className="desktop-nav" aria-label="Nawigacja główna">
          {links.map(([name, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          {user && <NotificationBell />}
          <div className="desktop-auth">
            {user ? (
              <>
                <Link href="/account">#{user.racingNumber || '—'} · Mój profil</Link>
                {user.role === 'admin' && <Link href="/admin">Stewardzi</Link>}
                <button onClick={logout}>Wyloguj</button>
              </>
            ) : (
              <>
                <Link href="/login">Zaloguj się</Link>
                <Link className="button-primary button-small" href="/register">
                  Dołącz
                </Link>
              </>
            )}
          </div>
          <button
            className="icon-button menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Nawigacja mobilna">
          {links.map(([name, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
              {name}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/account">Mój profil</Link>
              {user.role === 'admin' && <Link href="/admin">Panel stewardów</Link>}
              <button onClick={logout}>Wyloguj się</button>
            </>
          ) : (
            <>
              <Link href="/login">Zaloguj się</Link>
              <Link href="/register">Dołącz do ligi</Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
