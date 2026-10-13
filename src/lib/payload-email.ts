import { createHash } from 'node:crypto'
import type { EmailAdapter } from 'payload'
// Payload's built-in password reset uses the same durable, private delivery queue.
export const payloadEmail: EmailAdapter = ({ payload }) => ({
  name: 'race-control-outbox',
  defaultFromAddress: 'noreply@mail.jalochabuilds.site',
  defaultFromName: 'Race Control',
  async sendEmail(message) {
    const recipient = typeof message.to === 'string' ? message.to : ''
    if (!recipient || !message.html || typeof message.html !== 'string')
      throw new Error('Unsupported system email format')
    const key =
      'system:' +
      createHash('sha256')
        .update(recipient + message.subject + message.html)
        .digest('hex')
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
        status: 'pending',
      },
    })
    return { queued: true }
  },
})
