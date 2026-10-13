'use client'
import Link from '@/components/AppLink'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PendingReg {
  id: string | number
  driverName: string
  carModel: string
  racingNumber: number
  status: string
}

interface Props {
  raceId: string | number
  pendingList: PendingReg[]
}

export function AdminRaceStewardBar({ raceId, pendingList: initialList }: Props) {
  const router = useRouter()
  const [list, setList] = useState(initialList)
  const [processingId, setProcessingId] = useState<string | number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setList(initialList)
  }, [initialList])

  const handleAction = async (id: string | number, status: 'accepted' | 'rejected') => {
    setProcessingId(id)
    setMsg(null)

    try {
      const res = await fetch(`/api/admin/registrations/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMsg(`Błąd: ${data.error || 'Nie udało się zmienić statusu.'}`)
        return
      }

      setMsg(
        `Zgłoszenie #${id} zostało zmienione na: ${status === 'accepted' ? 'zaakceptowano' : 'odrzucono'}`,
      )
      setList((prev) => prev.filter((r) => r.id !== id))
      router.refresh()
    } catch {
      setMsg('Błąd połączenia z serwerem.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="bg-[#151A24] border-2 border-[#D9162C] p-5 space-y-4 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303848] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#D9162C]"></span>
          <span className="font-headline text-lg font-bold text-[#F4F6F8] tracking-wide">
            Panel sędziowski
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/collections/races/${raceId}`}
            className="px-3 py-1.5 bg-[#202633] hover:bg-[#303848] border border-[#303848] text-xs font-mono font-bold text-[#F4F6F8] transition-colors"
          >
            Edytuj wyścig w CMS
          </Link>
          <Link
            href="/admin/collections/registrations"
            className="px-3 py-1.5 bg-[#202633] hover:bg-[#303848] border border-[#303848] text-xs font-mono font-bold text-[#F4F6F8] transition-colors"
          >
            Wszystkie zgłoszenia w CMS
          </Link>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono text-emerald-200">
          {msg}
        </div>
      )}

      <div>
        <span className="text-xs font-mono text-[#A1AAB8] block mb-2">
          Kolejka oczekujących zgłoszeń do zatwierdzenia ({list.length}):
        </span>

        {list.length === 0 ? (
          <p className="text-xs font-mono text-[#A1AAB8]">
            Brak oczekujących zgłoszeń dla tego wyścigu. Wszystkie wnioski zostały rozpatrzone.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((reg) => (
              <div
                key={reg.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#080b12] border border-[#303848] gap-3"
              >
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="font-bold px-2 py-0.5 bg-[#D9162C] text-white">
                    #{reg.racingNumber}
                  </span>
                  <span className="font-semibold text-[#F4F6F8]">{reg.driverName}</span>
                  <span className="text-[#A1AAB8]">• {reg.carModel}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(reg.id, 'accepted')}
                    disabled={processingId === reg.id}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {processingId === reg.id ? 'Przetwarzanie...' : 'Zatwierdź'}
                  </button>
                  <button
                    onClick={() => handleAction(reg.id, 'rejected')}
                    disabled={processingId === reg.id}
                    className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-mono text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Odrzuć
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
