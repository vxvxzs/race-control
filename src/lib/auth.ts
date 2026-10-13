import { headers } from 'next/headers'
import { getPayloadClient } from './payload'
import type { User } from '@/payload-types'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayloadClient()
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })
    return (user as User) || null
  } catch (err) {
    console.error('Error fetching current user:', err)
    return null
  }
}
