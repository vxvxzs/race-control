'use client'
import Link from 'next/link'
import { useRef, useState, type PointerEvent } from 'react'
import { nurburgringOutline } from '@/lib/circuits'
export function Circuit() {
  const [flat, setFlat] = useState(false)
  const plane = useRef<HTMLDivElement>(null)
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      flat ||
      event.pointerType !== 'mouse' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const box = event.currentTarget.getBoundingClientRect()
    plane.current?.style.setProperty(
      '--tilt-x',
      `${38 + ((event.clientY - box.top) / box.height - 0.5) * 8}deg`,
    )
    plane.current?.style.setProperty(
      '--tilt-z',
      `${-28 + ((event.clientX - box.left) / box.width - 0.5) * 8}deg`,
    )
  }
  function reset() {
    plane.current?.style.removeProperty('--tilt-x')
    plane.current?.style.removeProperty('--tilt-z')
  }
  return (
    <section className="circuit-panel" aria-label="Układ Nürburgring GP">
      <div className="section-heading">
        <h2>Nürburgring GP</h2>
        <button
          className="circuit-toggle"
          onClick={() => {
            setFlat(!flat)
            reset()
          }}
          aria-pressed={flat}
        >
          {flat ? 'Widok przestrzenny' : 'Widok płaski'}
        </button>
      </div>
      <div
        className={`circuit-stage ${flat ? 'circuit-flat' : ''}`}
        onPointerMove={move}
        onPointerLeave={reset}
      >
        <div className="circuit-plane" ref={plane}>
          <svg className="circuit-shadow" viewBox="170 40 430 540" aria-hidden="true">
            <path d={nurburgringOutline} />
          </svg>
          <svg
            className="circuit-outline"
            viewBox="170 40 430 540"
            role="img"
            aria-label="Schemat pętli Grand Prix Nürburgringu od 2002 roku"
          >
            <path className="circuit-base" d={nurburgringOutline} />
            <path className="circuit-highlight" d={nurburgringOutline} pathLength="100" />
          </svg>
        </div>
      </div>
      <p className="circuit-caption">
        Schemat pętli GP. Rzut przestrzenny bez danych wysokości.{' '}
        <Link href="/credits#circuit">Źródło planu</Link>
      </p>
    </section>
  )
}
