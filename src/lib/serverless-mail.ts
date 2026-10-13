import type { Payload } from 'payload'
import { processEmailOutbox } from './notifications'

// Called only after a route has returned from Payload, so its transaction is committed.
// No detached promises: Vercel keeps the request alive until this bounded drain finishes.
export async function flushMail(payload: Payload, ids?: Array<number | string>) {
  if (process.env.MAIL_MODE !== 'resend') return
  try {
    await processEmailOutbox(payload, undefined, { ids, limit: 10, budgetMs: 45000 })
  } catch {
    console.error('Mail drain failed; durable outbox retained for recovery.')
  }
}
export function withMailDelivery<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    const response = await handler(...args)
    if (process.env.MAIL_MODE === 'resend') {
      try {
        const { getPayloadClient } = await import('./payload')
        await flushMail(await getPayloadClient())
      } catch {
        console.error(
          'Mail initialization failed; original response preserved and outbox retained.',
        )
      }
    }
    return response
  }
}
