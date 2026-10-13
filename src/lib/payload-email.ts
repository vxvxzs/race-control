import { createHash } from 'node:crypto'
import type { EmailAdapter } from 'payload'
export const systemEmailKey = (recipient: string, subject: string, html: string) =>
  'system:' +
  createHash('sha256')
    .update(recipient + subject + html)
    .digest('hex')
// Payload's built-in password reset uses the same durable, private delivery queue.
export const payloadEmail: EmailAdapter = ({ payload }) => ({
  name: 'race-control-outbox',
  defaultFromAddress: 'noreply@mail.jalochabuilds.site',
  defaultFromName: 'Race Control',
  async sendEmail(message) {
    const recipient = typeof message.to === 'string' ? message.to : ''
    if (!recipient || !message.html || typeof message.html !== 'string')
      throw new Error('Unsupported system email format')
    const link = message.html.match(
      /href="(https:\/\/[^" ]+\/reset-password\?token=[a-f0-9]{40})"/,
    )?.[1]
    const key = systemEmailKey(recipient, message.subject || '', message.html)
    await payload.create({
      collection: 'email-outbox',
      data: {
        key,
        recipient,
        subject: message.subject || 'Race Control',
        message:
          typeof message.text === 'string'
            ? message.text
            : 'Wiadomość dotycząca Twojego konta Race Control.',
        htmlBody: message.html,
        ...(link ? { link } : {}),
        status: 'pending',
      },
    })
    return { queued: true }
  },
})
