'use client'
import Link from 'next/link'

import { RacePhoto } from '@/components/RacePhoto'
import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedRedirect = searchParams.get('redirect') || '/account'
  const redirectUrl =
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    !requestedRedirect.includes('\\')
      ? requestedRedirect
      : '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Nieprawidłowe dane logowania.')
        return
      }

      router.push(redirectUrl)
      router.refresh()
    } catch {
      setErrorMsg('Błąd połączenia z serwerem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl font-black text-[#F4F6F8] tracking-tight">
          Zaloguj się
        </h1>
      </div>

      <div className="space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 bg-red-950/40 border-l-4 border-[#D9162C] text-xs text-red-200 font-medium"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-mono text-[#A1AAB8] mb-1.5">
              Adres e-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kierowca@simracing.pl"
              className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
            >
              Hasło
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#D9162C] hover:bg-[#B91225] text-white font-headline text-base font-extrabold tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[#A1AAB8]">
          Nie masz jeszcze konta?{' '}
          <Link href="/register" className="text-[#D9162C] font-semibold hover:underline">
            Utwórz konto
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <RacePhoto scene="night" />
      </div>
      <div className="auth-form-area">
        <Suspense
          fallback={
            <div className="text-center font-mono text-xs text-[#A1AAB8]">
              Ładowanie formularza...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
