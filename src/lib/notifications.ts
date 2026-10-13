import type { EmailOutbox } from '@/payload-types'
import type { Payload } from 'payload'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { claimMail } from './atomic'
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
export function renderEmail(
  subject: string,
  message: string,
  link?: string | null,
  action = 'Przejdź do Race Control',
) {
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><body style="margin:0;background:#eef1f5;font:16px/1.7 Arial,sans-serif;color:#18201e"><div style="max-width:560px;margin:32px auto;background:#fff;padding:40px;border-top:4px solid #d9162c"><p style="font-weight:800;letter-spacing:2px">RACE CONTROL</p><h1 style="font-size:25px;line-height:1.3">${escapeHtml(subject)}</h1><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>${link ? `<p><a href="${escapeHtml(link)}" style="background:#d9162c;color:white;padding:12px 20px;display:inline-block;text-decoration:none">${escapeHtml(action)}</a></p>` : ''}<hr style="border:0;border-top:1px solid #ddd"><small>Wiadomość dotycząca Twojego konta lub udziału w zawodach.</small></div></body></html>`
}
export async function deliverMail(mail: EmailOutbox) {
  const html = mail.htmlBody || renderEmail(mail.subject, mail.message, mail.link)
  const mode = process.env.MAIL_MODE || 'preview'
  if (mode === 'preview') {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Preview mail is disabled in production')
    const directory = path.resolve(process.env.MAIL_PREVIEW_DIR || 'work/mail')
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, `${mail.id}.html`), html)
    await writeFile(
      path.join(directory, `${mail.id}.json`),
      JSON.stringify(
        { to: mail.recipient, subject: mail.subject, message: mail.message, link: mail.link },
        null,
        2,
      ),
    )
    return 'preview' as const
  }
  if (mode === 'resend') {
    if (/@(?:[^@]*\.)?(?:test|invalid|example)$/i.test(mail.recipient)) return 'suppressed' as const
    if (!process.env.RESEND_API_KEY || !process.env.SMTP_FROM)
      throw new Error('Missing Resend configuration')
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': mail.key,
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM,
        to: [mail.recipient],
        subject: mail.subject,
        html,
        text: `${mail.message}\n${mail.link || ''}`,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`)
    const receipt = (await response.json()) as { id?: string }
    return { status: 'sent' as const, providerMessageId: receipt.id }
  }
  if (mode !== 'smtp' || !process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error('Missing SMTP configuration')
  const { default: nodemailer } = await import('nodemailer')
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  })
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: mail.recipient,
    subject: mail.subject,
    html,
    text: `${mail.message}\n${mail.link || ''}`,
    messageId: `<${Buffer.from(mail.key).toString('base64url')}@racecontrol>`,
  })
  return 'sent' as const
}
type Delivery = 'preview' | 'sent' | 'suppressed' | { status: 'sent'; providerMessageId?: string }
export async function processEmailOutbox(
  payload: Payload,
  sender: (mail: EmailOutbox) => Promise<Delivery> = deliverMail,
  options: { ids?: Array<string | number>; limit?: number; budgetMs?: number } = {},
) {
  const started = Date.now()
  const queue = await payload.find({
    collection: 'email-outbox',
    depth: 0,
    limit: options.limit || 20,
    sort: 'createdAt',
    where: {
      and: [
        ...(options.ids ? [{ id: { in: options.ids } }] : []),
        {
          or: [
            {
              and: [
                { status: { equals: 'pending' } },
                {
                  or: [
                    { nextAttempt: { exists: false } },
                    { nextAttempt: { less_than: new Date().toISOString() } },
                  ],
                },
              ],
            },
            {
              and: [
                { status: { equals: 'sending' } },
                { updatedAt: { less_than: new Date(Date.now() - 120000).toISOString() } },
              ],
            },
          ],
        },
      ],
    },
  })
  for (const mail of queue.docs) {
    if (options.budgetMs && Date.now() - started > options.budgetMs - 16000) break
    const firstAttempt =
      mail.firstAttemptAt || (mail.status === 'sending' ? mail.updatedAt : mail.createdAt)
    if (
      (mail.attempts || 0) >= 3 ||
      (process.env.MAIL_MODE === 'resend' &&
        (mail.attempts || mail.status === 'sending') &&
        Date.now() - Date.parse(firstAttempt) > 23 * 3600000)
    ) {
      await payload.update({
        collection: 'email-outbox',
        id: mail.id,
        data: {
          status: 'failed',
          lastError:
            'Retry limit or safe idempotency window exceeded; inspect provider before retrying.',
        },
      })
      continue
    }
    if (!(await claimMail(payload, mail.id)).length) continue
    const attempts = (mail.attempts || 0) + 1
    try {
      const receipt = await sender(mail)
      const status = typeof receipt === 'string' ? receipt : receipt.status
      await payload.update({
        collection: 'email-outbox',
        id: mail.id,
        data: {
          status,
          lastError: null,
          acceptedAt: new Date().toISOString(),
          providerMessageId: typeof receipt === 'object' ? receipt.providerMessageId : null,
        },
      })
    } catch (error) {
      await payload.update({
        collection: 'email-outbox',
        id: mail.id,
        data: {
          status:
            attempts >= 3 || (process.env.MAIL_MODE === 'smtp' && !smtpSafeToRetry(error))
              ? 'failed'
              : 'pending',
          lastError: error instanceof Error ? error.message : 'Delivery failed',
          nextAttempt: new Date(Date.now() + 60000 * attempts).toISOString(),
        },
      })
    }
  }
}

function smtpSafeToRetry(error: unknown): boolean {
  const e = error as { responseCode?: number; command?: string }
  return Boolean(
    (e.responseCode && e.responseCode >= 400) ||
    (e.command && ['CONN', 'EHLO', 'HELO', 'AUTH', 'MAIL FROM', 'RCPT TO'].includes(e.command)),
  )
}
