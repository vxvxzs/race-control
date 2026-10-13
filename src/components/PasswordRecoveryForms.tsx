'use client'
import { RaceButton } from '@/components/RaceButton'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from './AppLink'

const inputClass =
  'w-full bg-[#080b12] border border-[#303848] px-3.5 py-3 text-base text-[#F4F6F8] outline-none focus:border-[#D9162C]'
const buttonClass =
  'w-full py-3.5 bg-[#D9162C] hover:bg-[#B91225] text-white font-headline text-base font-bold disabled:opacity-50'

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const email = new FormData(event.currentTarget).get('email')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || 'Nie udało się wysłać prośby. Spróbuj ponownie później.')
      setMessage(result.message)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="recovery-form">
      <h1>Nie pamiętasz hasła?</h1>
      <p>Podaj adres e-mail użyty podczas rejestracji.</p>
      {message ? (
        <div role="status" className="verification-banner">
          {message}
          <p>
            Sprawdź skrzynkę oraz folder spam. Kolejna prośba może być dostępna dopiero po przerwie.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <label htmlFor="recovery-email">Adres e-mail</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            className={inputClass}
          />
          {error && <p role="alert">{error}</p>}
          <RaceButton type="submit" loading={busy} className={buttonClass}>
            {busy ? 'Wysyłanie prośby…' : 'Wyślij link do zmiany hasła'}
          </RaceButton>
        </form>
      )}
      <Link className="text-link" href="/login">
        Wróć do logowania
      </Link>
    </div>
  )
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [token] = useState(() => searchParams.get('token') || '')
  const [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState('')
  const valid = /^[a-f0-9]{40}$/.test(token)
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', '/reset-password')
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = form.get('password'),
      confirmPassword = form.get('confirmPassword')
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Nie udało się zmienić hasła.')
      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="recovery-form">
      <h1>Ustaw nowe hasło</h1>
      {success ? (
        <>
          <p role="status">Hasło zostało zmienione. Poprzednie sesje zostały zakończone.</p>
          <RaceButton className={buttonClass + ' block text-center'} href="/login">
            Zaloguj się nowym hasłem
          </RaceButton>
        </>
      ) : !valid ? (
        <p role="alert">Link jest nieprawidłowy lub niekompletny. Poproś o nowy link.</p>
      ) : (
        <>
          <p>Użyj od 10 do 128 znaków. Nowe hasło wpisz dwukrotnie.</p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="new-password">Nowe hasło</label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password">Potwierdź nowe hasło</label>
              <input
                id="confirm-new-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                className={inputClass}
              />
            </div>
            {error && <p role="alert">{error}</p>}
            <RaceButton type="submit" loading={busy} className={buttonClass}>
              {busy ? 'Zapisywanie…' : 'Zmień hasło'}
            </RaceButton>
          </form>
        </>
      )}
      {!success && (
        <Link className="text-link" href="/forgot-password">
          Poproś o nowy link
        </Link>
      )}
    </div>
  )
}
