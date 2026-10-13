import type { ReactNode } from 'react'
export function Status({
  children,
  state = 'neutral',
  className = '',
}: {
  children: ReactNode
  state?: 'neutral' | 'open' | 'confirmed' | 'pending' | 'rejected'
  className?: string
}) {
  return (
    <span className={`sport-status sport-status-${state} ${className}`}>
      <span aria-hidden="true" className="sport-status-mark">
        {state === 'confirmed' ? '✓' : state === 'pending' ? '◷' : state === 'rejected' ? '×' : '•'}
      </span>
      {children}
    </span>
  )
}
