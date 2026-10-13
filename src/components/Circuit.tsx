'use client'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { TrackVisual } from '@/lib/tracks'
export function Circuit({ name, outline }: Pick<TrackVisual, 'name' | 'outline'>) {
  const [flat, setFlat] = useState(false)
  const plane = useRef<HTMLDivElement>(null),
    frame = useRef(0),
    box = useRef<DOMRect | null>(null)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  function move(event: PointerEvent<HTMLDivElement>) {
    if (
      flat ||
      event.pointerType !== 'mouse' ||
      !matchMedia(
        '(hover: hover) and (min-width: 769px) and (prefers-reduced-motion: no-preference)',
      ).matches
    )
      return
    box.current ??= event.currentTarget.getBoundingClientRect()
    const { clientX, clientY } = event
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      if (!box.current) return
      plane.current?.style.setProperty(
        '--tilt-x',
        `${38 + ((clientY - box.current.top) / box.current.height - 0.5) * 6}deg`,
      )
      plane.current?.style.setProperty(
        '--tilt-z',
        `${-28 + ((clientX - box.current.left) / box.current.width - 0.5) * 6}deg`,
      )
    })
  }
  function reset() {
    cancelAnimationFrame(frame.current)
    box.current = null
    plane.current?.style.removeProperty('--tilt-x')
    plane.current?.style.removeProperty('--tilt-z')
  }
  return (
    <section className="circuit-panel" aria-label={`Układ toru ${name}`} data-reveal>
      <div className="section-heading">
        <h2>{name}</h2>
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
        onPointerEnter={reset}
      >
        <div className="circuit-plane" ref={plane}>
          <svg className="circuit-shadow" viewBox={outline.viewBox} aria-hidden="true">
            <path d={outline.path} />
          </svg>
          <svg
            className="circuit-outline"
            viewBox={outline.viewBox}
            role="img"
            aria-label={`${name} — ${outline.variant}`}
          >
            <path className="circuit-base" d={outline.path} />
            <path className="circuit-highlight" d={outline.path} pathLength="100" />
          </svg>
        </div>
      </div>
    </section>
  )
}
