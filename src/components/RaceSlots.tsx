'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'

type Props = {
  accepted: number
  capacity: number
  registrationStatus: 'open' | 'closed'
  raceStatus: 'upcoming' | 'completed'
}

export function RaceSlots({ accepted, capacity, registrationStatus, raceStatus }: Props) {
  const total = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 0
  const taken = Number.isFinite(accepted) ? Math.max(0, Math.min(Math.floor(accepted), total)) : 0
  const free = total - taken
  const root = useRef<HTMLDivElement>(null)
  const entered = useRef(false)
  const previous = useRef({ free, taken })
  const status =
    raceStatus === 'completed'
      ? 'Wyścig zakończony'
      : registrationStatus === 'closed'
        ? 'Zapisy zamknięte'
        : free === 0
          ? 'Lista pełna'
          : 'Zapisy otwarte'

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const segments = [...element.querySelectorAll<HTMLElement>('.slots__seg')]
    const number = element.querySelector<HTMLElement>('[data-count]')!
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const styles = getComputedStyle(element)
    const accent = styles.getPropertyValue('--slots-accent').trim()
    const empty = styles.getPropertyValue('--slots-free').trim()
    const before = previous.current
    let observer: IntersectionObserver | undefined
    let context: gsap.Context | undefined
    const restore = () => {
      context?.revert()
      number.textContent = String(free)
      previous.current = { free, taken }
    }
    const stop = () => {
      if (preference.matches) {
        observer?.disconnect()
        entered.current = true
        restore()
      }
    }
    try {
      context = gsap.context((self) => {
        if (preference.matches) {
          entered.current = true
          previous.current = { free, taken }
          return
        }
        const play = () => {
          if (preference.matches) {
            restore()
            return
          }
          try {
            self.add(() => {
              if (!entered.current) {
                const occupied = segments.slice(0, taken)
                gsap.set(occupied, { backgroundColor: empty })
                number.textContent = String(total)
                const timeline = gsap.timeline({
                  delay: 0.35,
                  onStart: () => {
                    entered.current = true
                  },
                  onComplete: () => {
                    previous.current = { free, taken }
                  },
                })
                timeline.from(segments, {
                  opacity: 0,
                  x: -8,
                  duration: 0.35,
                  ease: 'power3.out',
                  stagger: 0.02,
                })
                timeline.addLabel('fill', '+=0.1')
                occupied.forEach((segment, index) => {
                  const time = `fill+=${index * 0.085}`
                  timeline
                    .to(
                      segment,
                      {
                        backgroundColor: accent,
                        duration: 0.3,
                        ease: 'power2.out',
                        clearProps: 'backgroundColor',
                      },
                      time,
                    )
                    .add(() => {
                      number.textContent = String(total - index - 1)
                    }, time)
                })
              } else {
                const count = { value: Math.max(0, Math.min(before.free, total)) }
                number.textContent = String(count.value)
                segments.forEach((segment, index) => {
                  const wasTaken = index < before.taken
                  const isTaken = index < taken
                  if (wasTaken === isTaken) return
                  gsap.fromTo(
                    segment,
                    { backgroundColor: wasTaken ? accent : empty },
                    {
                      backgroundColor: isTaken ? accent : empty,
                      duration: 0.3,
                      ease: 'power2.out',
                      clearProps: 'backgroundColor',
                    },
                  )
                })
                gsap.to(count, {
                  value: free,
                  duration: 0.3,
                  ease: 'power2.out',
                  onUpdate: () => {
                    number.textContent = String(Math.round(count.value))
                  },
                  onComplete: () => {
                    previous.current = { free, taken }
                  },
                })
              }
            })
          } catch {
            restore()
          }
        }
        if (entered.current || !('IntersectionObserver' in window)) play()
        else {
          observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect()
              play()
            }
          })
          observer.observe(element)
        }
      }, element)
    } catch {
      restore()
    }
    preference.addEventListener('change', stop)
    return () => {
      observer?.disconnect()
      preference.removeEventListener('change', stop)
      restore()
    }
  }, [free, taken, total])

  return (
    <div
      ref={root}
      className="slots"
      data-total={total}
      data-free={free}
      role="meter"
      aria-label={`Dostępność miejsc — ${status}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={free}
      aria-valuetext={`${free} z ${total} miejsc wolnych`}
    >
      <div className="slots__head" aria-hidden="true">
        <span className="slots__status">
          <i className="slots__tick" />
          {status}
        </span>
        <span className="slots__count">
          <b data-count>{free}</b>z {total} miejsc wolnych
        </span>
      </div>
      <div className="slots__bar" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={`slots__seg ${index < taken ? 'is-taken' : 'is-free'}`} />
        ))}
      </div>
    </div>
  )
}
