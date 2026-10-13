'use client'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const ease = 'cubic-bezier(.22,.68,0,1)'
const seen = new Set<string>()

// The observer adds an entry animation without hiding the initial content with CSS.
export function Motion() {
  const pathname = usePathname()
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches) return
    const animations: Animation[] = []
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const element = entry.target as HTMLElement
          const key = `${pathname}:${element.dataset.motionKey}`
          observer.unobserve(element)
          if (seen.has(key) || preference.matches) continue
          seen.add(key)
          const hero = element.hasAttribute('data-hero-reveal')
          animations.push(
            element.animate(
              [
                { opacity: 0, transform: `translateY(${hero ? 22 : 14}px)` },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              {
                duration: hero ? 800 : 440,
                delay: Number(element.dataset.delay || 0),
                easing: ease,
                fill: 'backwards',
              },
            ),
          )
        }
      },
      { threshold: 0.08 },
    )
    const selector =
      '[data-reveal], [data-hero-reveal], .schedule-row, .roster-row, .paddock-news article'
    const registered = new WeakSet<HTMLElement>()
    let nextKey = 0
    const register = (root: ParentNode) => {
      const elements = [...root.querySelectorAll<HTMLElement>(selector)]
      if (root instanceof HTMLElement && root.matches(selector)) elements.unshift(root)
      for (const el of elements) {
        if (registered.has(el)) continue
        registered.add(el)
        el.dataset.motionKey = el.dataset.motionKey || el.id || String(nextKey++)
        observer.observe(el)
      }
    }
    const content = document.getElementById('content') || document.body
    register(content)
    // Next.js can stream the page after the layout effect has already run.
    // Inspect only added element subtrees, not the whole document on every tick.
    const streamed = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) if (node instanceof HTMLElement) register(node)
    })
    streamed.observe(content, { childList: true, subtree: true })
    const stop = () => {
      if (preference.matches) animations.forEach((a) => a.cancel())
    }
    preference.addEventListener('change', stop)
    return () => {
      observer.disconnect()
      streamed.disconnect()
      animations.forEach((a) => a.cancel())
      preference.removeEventListener('change', stop)
    }
  }, [pathname])
  return null
}

export function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const previous = useRef(value)
  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    let frame: number
    const start = performance.now()
    const update = (time: number) => {
      const progress = Math.min(1, (time - start) / 450)
      setShown(Math.round(from + (value - from) * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return (
    <span className="animated-number" aria-label={String(value)}>
      {shown}
    </span>
  )
}

export function LiveStandings({ children }: { children: ReactNode }) {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const positions = useRef(new Map<string, number>())
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh()
    }, 30000)
    return () => clearInterval(timer)
  }, [router])
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    // Measure visible rows together before starting any animation.
    const rows = [...(root.current?.querySelectorAll<HTMLElement>('[data-standing]') || [])]
      .filter((row) => row.getClientRects().length > 0)
      .map((row) => ({ row, id: row.dataset.standing!, top: row.offsetTop }))
    for (const { row, id, top } of rows) {
      const old = positions.current.get(id)
      next.set(id, top)
      if (
        old !== undefined &&
        old !== top &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        row.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'translateY(0)' }], {
          duration: 500,
          easing: ease,
        })
    }
    positions.current = next
  }, [children])
  return <div ref={root}>{children}</div>
}
