'use client'

import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { gsap } from 'gsap'
import Link from './AppLink'
import './RaceButton.css'

type Shared = {
  children: ReactNode
  variant?: 'solid' | 'outline'
  disabled?: boolean
  loading?: boolean
  className?: string
}
type Props = Shared &
  (
    | (Omit<ComponentProps<typeof Link>, keyof Shared> & {
        href: ComponentProps<typeof Link>['href']
      })
    | (Omit<ComponentProps<'button'>, keyof Shared> & { href?: never })
  )

export function RaceButton({
  children,
  variant = 'solid',
  disabled = false,
  loading = false,
  className = '',
  ...props
}: Props) {
  const root = useRef<HTMLSpanElement>(null)
  const inactive = disabled || loading
  useEffect(() => {
    const button = root.current?.parentElement
    const fill = root.current?.previousElementSibling
    if (!button || !(fill instanceof HTMLElement) || inactive) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let context: gsap.Context | undefined
    let hovered = matchMedia('(hover: hover)').matches && button.matches(':hover')
    let focused = button.matches(':focus-visible')
    const enter = () => {
      if (!context) return
      if (Number(gsap.getProperty(fill, 'xPercent')) > 0) gsap.set(fill, { xPercent: -110 })
      gsap.to(fill, { xPercent: 0, duration: 0.38, ease: 'power3.out', overwrite: true })
    }
    const leave = () => {
      if (context && !hovered && !focused)
        gsap.to(fill, { xPercent: 110, duration: 0.3, ease: 'power3.in', overwrite: true })
    }
    const pointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      hovered = true
      enter()
    }
    const pointerLeave = () => {
      hovered = false
      leave()
    }
    const focus = () => {
      focused = button.matches(':focus-visible')
      if (focused) enter()
    }
    const blur = () => {
      focused = false
      leave()
    }
    const configure = () => {
      delete button.dataset.motion
      gsap.killTweensOf(fill)
      context?.revert()
      context = undefined
      if (media.matches) return
      try {
        // Override the fallback CSS translation so GSAP does not add it to xPercent.
        context = gsap.context(() => gsap.set(fill, { x: 0, skewX: -18, xPercent: -110 }), button)
        button.dataset.motion = 'true'
        if (hovered || focused) enter()
      } catch {
        context?.revert()
        context = undefined
      }
    }
    configure()
    button.addEventListener('pointerenter', pointerEnter)
    button.addEventListener('pointerleave', pointerLeave)
    button.addEventListener('focus', focus)
    button.addEventListener('blur', blur)
    media.addEventListener('change', configure)
    return () => {
      button.removeEventListener('pointerenter', pointerEnter)
      button.removeEventListener('pointerleave', pointerLeave)
      button.removeEventListener('focus', focus)
      button.removeEventListener('blur', blur)
      media.removeEventListener('change', configure)
      gsap.killTweensOf(fill)
      context?.revert()
      delete button.dataset.motion
    }
  }, [inactive])
  const content = (
    <>
      <span className="race-button__fill" aria-hidden="true" />
      <span ref={root} className="race-button__label">
        {children}
      </span>
    </>
  )
  const shared = {
    className: `race-button race-button--${variant} ${className}`,
    'aria-busy': loading || undefined,
    'aria-disabled': inactive || undefined,
  }
  if (props.href !== undefined) {
    if (inactive)
      return (
        <a {...shared} role="link" aria-label={props['aria-label']} tabIndex={-1}>
          {content}
        </a>
      )
    return (
      <Link {...props} {...shared}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" {...props} {...shared} disabled={inactive}>
      {content}
    </button>
  )
}
