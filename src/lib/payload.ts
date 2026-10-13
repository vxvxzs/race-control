import { getPayload as getPayloadInstance, type Payload } from 'payload'
import config from '@payload-config'

let cachedPayload: Payload | null = null

export async function getPayloadClient(): Promise<Payload> {
  if (cachedPayload) {
    return cachedPayload
  }

  cachedPayload = await getPayloadInstance({ config })
  return cachedPayload
}
