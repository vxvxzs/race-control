'use client'
import { Status } from './Status'
import Link from '@/components/AppLink'

import { useRouter } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import { SlotMeter } from './SlotMeter'

interface WidgetProps {
  raceSlug: string
  registrationStatus: 'open' | 'closed'
  raceStatus: 'upcoming' | 'completed'
  maxParticipants: number
  acceptedCount: number
  serverPassword?: string | null
}

interface UserSession {
  id: string
  name: string
  email: string
  role: 'admin' | 'driver'
  racingNumber?: number
  emailVerified?: boolean
  favoriteCar?: string
  team?: string
}

interface ExistingRegistration {
  id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  carModel: string
  racingNumber: number
  registeredAt: string
  adminNote?: string
}

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

export function RaceRegistrationWidget({
  raceSlug,
  registrationStatus,
  raceStatus,
  maxParticipants,
  acceptedCount: initialAcceptedCount,
  serverPassword,
}: WidgetProps) {
  const router = useRouter()
  const previousStatus = useRef<string | null>(null)
  const initialized = useRef(false)
  const snapshotSignature = useRef(`${initialAcceptedCount}:${registrationStatus}:${raceStatus}`)
  const [visiblePassword, setVisiblePassword] = useState(serverPassword)
  const [user, setUser] = useState<UserSession | null>(null)
  const [existingReg, setExistingReg] = useState<ExistingRegistration | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [acceptedCount, setAcceptedCount] = useState(initialAcceptedCount)

  const [liveRegistrationStatus, setLiveRegistrationStatus] = useState(registrationStatus)
  const [liveRaceStatus, setLiveRaceStatus] = useState(raceStatus)
  useEffect(() => {
    setAcceptedCount(initialAcceptedCount)
    setLiveRegistrationStatus(registrationStatus)
    setLiveRaceStatus(raceStatus)
  }, [initialAcceptedCount, registrationStatus, raceStatus])
  useEffect(() => {
    let cancelled = false
    async function refreshGrid() {
      if (document.hidden) return
      try {
        const r = await fetch(`/api/races/${raceSlug}/snapshot`, { cache: 'no-store' })
        if (!r.ok || cancelled) return
        const d = await r.json()
        if (cancelled) return
        const signature = `${d.acceptedCount}:${d.registrationStatus}:${d.raceStatus}`
        if (snapshotSignature.current !== signature) {
          snapshotSignature.current = signature
          router.refresh()
        }
        setAcceptedCount(d.acceptedCount)
        setLiveRegistrationStatus(d.registrationStatus)
        setLiveRaceStatus(d.raceStatus)
      } catch {
        /* The last confirmed count stays visible until the next successful poll. */
      }
    }
    refreshGrid()
    const timer = setInterval(refreshGrid, 15000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [raceSlug, router])

  // Form state
  const [carModel, setCarModel] = useState('')
  const [racingNumber, setRacingNumber] = useState('')

  // Check auth and current registration status
  useEffect(() => {
    async function loadState() {
      try {
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        if (authData.authenticated && authData.user) {
          setUser(authData.user)
          if (!initialized.current) {
            setCarModel(authData.user.favoriteCar || GT3_CARS[0])
            setRacingNumber(authData.user.racingNumber ? String(authData.user.racingNumber) : '')
            initialized.current = true
          }

          // Check if driver is already registered
          const regRes = await fetch(
            `/api/races/${raceSlug}/check-registration?userId=${authData.user.id}`,
          )
          if (regRes.ok) {
            const regData = await regRes.json()
            if (regData.registration) {
              setVisiblePassword(regData.registration.serverPassword)
              if (previousStatus.current && previousStatus.current !== regData.registration.status)
                router.refresh()
              previousStatus.current = regData.registration.status
              setExistingReg(regData.registration)
            } else {
              previousStatus.current = null
              setExistingReg(null)
              setVisiblePassword(undefined)
            }
          }
        } else {
          setUser(null)
          setExistingReg(null)
          setVisiblePassword(undefined)
        }
      } catch {
        setErrorMsg('Nie udało się pobrać zgłoszenia. Odśwież stronę, aby ponowić próbę.')
      } finally {
        setLoading(false)
      }
    }
    loadState()
    const interval = setInterval(loadState, 15000)
    return () => clearInterval(interval)
  }, [raceSlug, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setSubmitting(true)
    if (!user?.emailVerified) {
      setErrorMsg('Potwierdź adres e-mail w panelu kierowcy przed zapisem.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/races/${raceSlug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carModel,
          racingNumber: Number(racingNumber),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Wystąpił błąd podczas rejestracji.')
        if (data.existingStatus) {
          setExistingReg({
            id: 'existing',
            status: data.existingStatus,
            carModel,
            racingNumber: Number(racingNumber),
            registeredAt: new Date().toISOString(),
          })
        }
        return
      }

      window.dispatchEvent(new Event('race-control:update'))
      setSuccessMsg('Zgłoszenie zostało wysłane. Czeka na decyzję stewardów.')
      setExistingReg(data.registration)
    } catch {
      setErrorMsg('Błąd połączenia z serwerem.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Czy na pewno chcesz wycofać swoje zgłoszenie z tego wyścigu?')) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setCancelling(true)

    try {
      const res = await fetch(`/api/races/${raceSlug}/cancel`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Nie udało się anulować zgłoszenia.')
        return
      }

      window.dispatchEvent(new Event('race-control:update'))
      setSuccessMsg('Zgłoszenie zostało anulowane.')
      if (existingReg?.status === 'accepted') {
        setAcceptedCount((prev) => Math.max(0, prev - 1))
      }
      setExistingReg((prev) => (prev ? { ...prev, status: 'cancelled' } : null))
    } catch {
      setErrorMsg('Błąd połączenia z serwerem.')
    } finally {
      setCancelling(false)
    }
  }

  const isFull = acceptedCount >= maxParticipants
  const isOpen = liveRegistrationStatus === 'open' && liveRaceStatus === 'upcoming'

  if (loading)
    return (
      <div className="registration-loading" role="status">
        Pobieranie zgłoszenia…
      </div>
    )

  return (
    <div className="registration-widget space-y-6">
      <div className="registration-head">
        <div>
          <h3>Twoje zgłoszenie</h3>
          <span>
            {acceptedCount} / {maxParticipants} miejsc
          </span>
        </div>
        <SlotMeter accepted={acceptedCount} capacity={maxParticipants} />
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-red-950/40 border-l-4 border-[#D9162C] text-sm text-red-200 font-medium"
        >
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          className="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 text-sm text-emerald-200 font-medium"
        >
          {successMsg}
        </div>
      )}

      {/* Case 1: Completed Race */}
      {liveRaceStatus === 'completed' && (
        <div className="p-4 bg-[#080b12] border border-[#303848] text-sm text-[#A1AAB8]">
          Wyścig zakończony. Sprawdź opublikowany protokół w zakładce Wyniki.
        </div>
      )}

      {/* Case 2: User is NOT logged in */}
      {!user && liveRaceStatus === 'upcoming' && !isOpen && (
        <p className="muted text-sm">Zapisy na ten wyścig są zamknięte.</p>
      )}
      {!user && liveRaceStatus === 'upcoming' && isFull && isOpen && (
        <p className="muted text-sm">Lista startowa jest pełna.</p>
      )}
      {!user && liveRaceStatus === 'upcoming' && isOpen && !isFull && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-[#A1AAB8] leading-relaxed">
            Zaloguj się, aby wysłać zgłoszenie. Nowe konto wymaga potwierdzenia adresu e-mail.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={`/login?redirect=/races/${raceSlug}`}
              className="px-6 py-3 bg-[#D9162C] hover:bg-[#B91225] text-white font-headline text-base font-bold tracking-wider transition-colors"
            >
              Zaloguj się i dołącz
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 bg-[#202633] hover:bg-[#303848] border border-[#303848] text-[#F4F6F8] font-headline text-base font-bold tracking-wider transition-colors"
            >
              Utwórz konto
            </Link>
          </div>
        </div>
      )}

      {/* Case 3: User IS logged in AND has existing registration */}
      {user && existingReg && existingReg.status !== 'cancelled' && (
        <div className="space-y-5">
          <div className="p-5 bg-[#080b12] border border-[#303848] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#A1AAB8]">Status zgłoszenia</span>
              <Status
                state={
                  existingReg.status === 'accepted'
                    ? 'confirmed'
                    : existingReg.status === 'rejected'
                      ? 'rejected'
                      : 'pending'
                }
              >
                {existingReg.status === 'accepted'
                  ? 'Potwierdzony start'
                  : existingReg.status === 'rejected'
                    ? 'Zgłoszenie odrzucone'
                    : 'Oczekuje na decyzję stewardów'}
              </Status>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2 border-t border-[#303848]">
              <div>
                <span className="text-[#A1AAB8] block">Pojazd</span>
                <span className="text-[#F4F6F8] font-semibold">{existingReg.carModel}</span>
              </div>
              <div>
                <span className="text-[#A1AAB8] block">Numer startowy</span>
                <span className="text-[#F4F6F8] font-semibold">#{existingReg.racingNumber}</span>
              </div>
              <div>
                <span className="text-[#A1AAB8] block">Data zgłoszenia</span>
                <span className="text-[#F4F6F8] font-semibold">
                  {new Date(existingReg.registeredAt).toLocaleString('pl-PL', {
                    timeZone: 'Europe/Warsaw',
                  })}
                </span>
              </div>
            </div>

            {/* If accepted, show server password! */}
            {existingReg.status === 'accepted' && (
              <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-800/40">
                <span className="text-xs font-mono text-emerald-300 block mb-1 font-bold">
                  Dostęp do serwera
                </span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#A1AAB8]">Hasło serwera:</span>
                  <span className="px-2 py-0.5 bg-[#080b12] border border-[#303848] text-white font-bold select-all">
                    {visiblePassword || 'Brak hasła (serwer publiczny)'}
                  </span>
                </div>
              </div>
            )}

            {/* If rejected, show admin note */}
            {existingReg.status === 'rejected' && existingReg.adminNote && (
              <div className="mt-3 p-3 bg-red-950/20 border border-red-800/30 text-xs">
                <span className="text-red-400 font-bold block mb-1">Uwagi sędziów:</span>
                <span className="text-[#A1AAB8]">{existingReg.adminNote}</span>
              </div>
            )}
          </div>

          {/* Cancel button if registration is still open */}
          {isOpen && ['pending', 'accepted'].includes(existingReg.status) && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#A1AAB8]">
                Możesz wycofać swoje zgłoszenie do momentu zamknięcia listy startowej.
              </span>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-[#202633] hover:bg-red-950/40 hover:text-red-300 border border-[#303848] text-xs font-mono font-bold text-[#A1AAB8] transition-colors"
              >
                {cancelling ? 'Anulowanie...' : 'Anuluj zgłoszenie'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Case 4: User IS logged in AND NOT registered (or cancelled) */}
      {user &&
        (!existingReg || existingReg.status === 'cancelled') &&
        liveRaceStatus === 'upcoming' && (
          <>
            {!isOpen ? (
              <div className="p-4 bg-[#080b12] border border-[#303848] text-sm text-[#A1AAB8]">
                Zapisy na ten wyścig zostały zamknięte przez administratora ligi.
              </div>
            ) : !user.emailVerified ? (
              <div className="verification-banner">
                <strong>Potwierdź swój adres e-mail przed startem.</strong>
                <p>Link czeka w Twojej skrzynce.</p>
                <Link className="text-link" href="/account">
                  Przejdź do panelu kierowcy
                </Link>
              </div>
            ) : isFull ? (
              <div className="p-4 bg-amber-950/30 border border-amber-800/40 text-sm text-amber-200">
                Osiągnięto maksymalną liczbę uczestników ({maxParticipants} miejsc). Rejestracja
                została wstrzymana.
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="race-driver"
                      className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                    >
                      Kierowca zgłaszający
                    </label>
                    <input
                      id="race-driver"
                      type="text"
                      disabled
                      value={`${user.name} (${user.team || 'Brak zespołu'})`}
                      className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="race-number"
                      className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                    >
                      Numer startowy (#)
                    </label>
                    <input
                      id="race-number"
                      type="number"
                      min="1"
                      max="999"
                      required
                      value={racingNumber}
                      onChange={(e) => setRacingNumber(e.target.value)}
                      className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] font-mono focus:border-[#D9162C] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="race-carModel"
                      className="block text-xs font-mono text-[#A1AAB8] mb-1.5"
                    >
                      Wybór samochodu GT3
                    </label>
                    <select
                      id="race-carModel"
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      className="w-full bg-[#080b12] border border-[#303848] px-3.5 py-2.5 text-sm text-[#F4F6F8] focus:border-[#D9162C] outline-none"
                    >
                      {GT3_CARS.map((car) => (
                        <option key={car} value={car}>
                          {car}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-[#A1AAB8]">
                    Zgłoszenie podlega weryfikacji przez administratora ligi.
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#D9162C] hover:bg-[#B91225] text-white font-headline text-base font-extrabold tracking-wider transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Przesyłanie zgłoszenia...' : 'Zapisz się na wyścig'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
    </div>
  )
}
