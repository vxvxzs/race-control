import 'dotenv/config'
process.env.PAYLOAD_DB_PUSH = 'true'
const { getPayloadClient } = await import('./lib/payload')
const payload = await getPayloadClient()
console.log('Schema ready. Stop other database processes before running this command.')
await payload.destroy()

process.exit(0)
