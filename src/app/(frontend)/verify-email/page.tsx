'use client'
import Link from '@/components/AppLink'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
function Verify() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState(''),
    [busy, setBusy] = useState(false)
  async function verify() {
    setBusy(true)
    try {
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await r.json()
      setState(r.ok ? 'Adres potwierdzony. Możesz zapisywać się na wyścigi.' : data.error)
    } catch {
      setState('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-shell">
      <span className="eyebrow">Twoje konto</span>
      <h1>Potwierdź adres e-mail</h1>
      <p>Jeden krok dzieli Cię od miejsca na starcie.</p>
      {state && <p role="status">{state}</p>}
      <button className="button-primary" onClick={verify} disabled={busy || !token}>
        {busy ? 'Potwierdzanie…' : 'Potwierdź adres'}
      </button>
      <Link href="/account">Przejdź do panelu kierowcy</Link>
    </div>
  )
}
export default function Page() {
  return (
    <Suspense fallback={<p>Ładowanie…</p>}>
      <Verify />
    </Suspense>
  )
}
