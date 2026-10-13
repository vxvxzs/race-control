'use client'
import { RaceButton } from '@/components/RaceButton'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RaceSlots } from './RaceSlots'

type Snapshot = {
  acceptedCount: number
  maxParticipants: number
  registrationStatus: 'open' | 'closed'
  raceStatus: 'upcoming' | 'completed'
}
export function HeroRegistration({
  slug,
  initial,
}: {
  slug: string | null
  initial: Snapshot | null
}) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState({ slug, value: initial })
  const race = snapshot.slug === slug ? snapshot.value : initial
  useEffect(() => {
    setSnapshot({ slug, value: initial })
  }, [slug, initial])
  useEffect(() => {
    const controller = new AbortController()
    let fetching = false
    const refresh = async () => {
      if (document.hidden || fetching) return
      fetching = true
      try {
        const response = await fetch('/api/races/upcoming', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok || controller.signal.aborted) return
        const data: { race: (Snapshot & { slug: string }) | null } = await response.json()
        if (controller.signal.aborted) return
        if ((data.race?.slug ?? null) !== slug) {
          router.refresh()
        } else setSnapshot({ slug, value: data.race })
      } catch {
        /* Keep the last confirmed snapshot on a temporary connection failure. */
      } finally {
        fetching = false
      }
    }
    const timer = setInterval(refresh, 15000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [slug, router])
  if (!race || !slug) return null
  const free = Math.max(0, race.maxParticipants - race.acceptedCount)
  const open = race.registrationStatus === 'open' && race.raceStatus === 'upcoming'
  return (
    <>
      <div className="hero-actions">
        <RaceButton className="button-primary" href={`/races/${slug}#registration`}>
          {open && free > 0 ? 'Zapisz się na wyścig' : 'Zobacz wydarzenie'}
        </RaceButton>
      </div>
      <div className="hero-availability">
        <RaceSlots
          key={slug}
          accepted={race.acceptedCount}
          capacity={race.maxParticipants}
          registrationStatus={race.registrationStatus}
          raceStatus={race.raceStatus}
        />
      </div>
    </>
  )
}
