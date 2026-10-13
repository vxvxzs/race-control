'use client'
import Link from '@/components/AppLink'
import { useEffect, useState } from 'react'
import { Status } from './Status'
import { SlotMeter } from './SlotMeter'
type Snapshot = {
  acceptedCount: number
  maxParticipants: number
  registrationStatus: 'open' | 'closed'
  raceStatus: 'upcoming' | 'completed'
}
export function HeroRegistration({ slug, initial }: { slug: string; initial: Snapshot }) {
  const [race, setRace] = useState(initial)
  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (document.hidden) return
      try {
        const response = await fetch(`/api/races/${slug}/snapshot`, { cache: 'no-store' })
        if (response.ok && active) {
          const data: Snapshot = await response.json()
          if (active) setRace(data)
        }
      } catch {
        /* Keep the last confirmed snapshot on a temporary connection failure. */
      }
    }
    const timer = setInterval(refresh, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [slug])
  const free = Math.max(0, race.maxParticipants - race.acceptedCount)
  const open = race.registrationStatus === 'open' && race.raceStatus === 'upcoming'
  return (
    <>
      <div className="hero-actions">
        <Link className="button-primary" href={`/races/${slug}#registration`}>
          {open && free > 0 ? 'Zapisz się na wyścig' : 'Zobacz wydarzenie'}
        </Link>
      </div>
      <div className="hero-availability">
        <Status
          state={
            open && free > 0 ? 'open' : race.raceStatus === 'completed' ? 'confirmed' : 'neutral'
          }
        >
          {race.raceStatus === 'completed'
            ? 'Wyścig zakończony'
            : open
              ? free > 0
                ? 'Zapisy otwarte'
                : 'Lista pełna'
              : 'Zapisy zamknięte'}
        </Status>
        <span>
          {free} z {race.maxParticipants} miejsc wolnych
        </span>
        <SlotMeter accepted={race.acceptedCount} capacity={race.maxParticipants} />
      </div>
    </>
  )
}
