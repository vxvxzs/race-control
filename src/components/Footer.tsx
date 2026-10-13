import Link from 'next/link'
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-content">
        <Link href="/" className="footer-brand">
          RACE CONTROL
        </Link>
        <nav aria-label="Nawigacja stopki">
          <Link href="/calendar">Kalendarz</Link>
          <Link href="/rules">Regulamin</Link>
          <Link href="/account">Panel kierowcy</Link>
          <Link href="/credits">Materiały i licencje</Link>
        </nav>
      </div>
      <div className="page-width footer-bottom">
        <span>© 2026 Race Control</span>
        <span>Wersja demonstracyjna · przykładowe dane sportowe</span>
      </div>
    </footer>
  )
}
