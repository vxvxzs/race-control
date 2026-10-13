import 'dotenv/config'
import { getPayloadClient } from './lib/payload'
import { processEmailOutbox } from './lib/notifications'
const payload = await getPayloadClient()
console.log('Mail worker active. Local preview: work/mail')
let stopping = false
process.on('SIGINT', () => {
  stopping = true
})
process.on('SIGTERM', () => {
  stopping = true
})
do {
  try {
    await processEmailOutbox(payload)
  } catch (error) {
    console.error('Mail queue error', {
      name: error instanceof Error ? error.name : 'UnknownError',
    })
  }
  if (process.argv.includes('--once')) break
  await new Promise((resolve) => setTimeout(resolve, 5000))
} while (!stopping)
await payload.destroy()
