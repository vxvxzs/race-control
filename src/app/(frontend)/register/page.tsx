'use client'
import Link from 'next/link'

import { RacePhoto } from '@/components/RacePhoto'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

const GT3_CARS = [
  'Porsche 992 GT3 R',
  'Ferrari 296 GT3',
  'BMW M4 GT3',
  'Mercedes-AMG GT3 Evo',
  'Aston Martin Vantage GT3',
  'Audi R8 LMS GT3 Evo II',
  'McLaren 720S GT3 Evo',
  'Lamborghini Huracan GT3 EVO2',
]

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [racingNumber, setRacingNumber] = useState('')
  const [team, setTeam] = useState('')
  const [favoriteCar, setFavoriteCar] = useState(GT3_CARS[0])

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password !== confirmPassword) {
      setErrorMsg('Hasła nie są identyczne.')
      return
    }

    if (password.length < 10) {
      setErrorMsg('Hasło musi mieć co najmniej 10 znaków.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          racingNumber: racingNumber ? Number(racingNumber) : undefined,
          team,
          favoriteCar,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Błąd rejestracji konta.')
        return
      }

      setSuccessMsg('Konto utworzone pomyślnie! Logowanie...')

      // Auto login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (loginRes.ok) {
        router.push('/account')
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch {
      setErrorMsg('Błąd połączenia z serwerem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <RacePhoto scene="night" />
      </div>
      <div className="auth-form-area">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-black text-[#F4F6F8] tracking-tight">
              Utwórz konto kierowcy
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

            {successMsg && (
              <div className="p-3.5 bg-emerald-950/40 border-l-4 border-emerald-500 text-xs text-emerald-200 font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="register-name"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Imię i nazwisko lub pseudonim *
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Michał Kowalczyk"
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="register-email"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Adres e-mail *
                  </label>
                  <input
                    id="register-email"
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
                    htmlFor="register-password"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Hasło *
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 10 znaków"
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-confirmPassword"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Potwierdź hasło *
                  </label>
                  <input
                    id="register-confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="powtórz hasło"
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-racingNumber"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Numer startowy (#)
                  </label>
                  <input
                    id="register-racingNumber"
                    type="number"
                    min="1"
                    max="999"
                    value={racingNumber}
                    onChange={(e) => setRacingNumber(e.target.value)}
                    placeholder="np. 42"
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] font-mono outline-none focus:border-[#D9162C] transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-team"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Zespół / Team
                  </label>
                  <input
                    id="register-team"
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="np. Apex Racing"
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="register-favoriteCar"
                    className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                  >
                    Główny samochód GT3
                  </label>
                  <select
                    id="register-favoriteCar"
                    value={favoriteCar}
                    onChange={(e) => setFavoriteCar(e.target.value)}
                    className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] outline-none focus:border-[#D9162C] transition-colors"
                  >
                    {GT3_CARS.map((car) => (
                      <option key={car} value={car}>
                        {car}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#D9162C] hover:bg-[#B91225] text-white font-headline text-base font-extrabold tracking-wider transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Tworzenie konta...' : 'Zarejestruj się i dołącz'}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-[#A1AAB8]">
              Posiadasz już konto?{' '}
              <Link href="/login" className="text-[#D9162C] font-semibold hover:underline">
                Zaloguj się
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
