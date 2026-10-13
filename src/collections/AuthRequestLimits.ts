import type { CollectionConfig } from 'payload'

// Shared across serverless workers. Keys are HMAC digests, never addresses or IPs.
export const AuthRequestLimits: CollectionConfig = {
  slug: 'auth-request-limits',
  admin: { hidden: true },
  lockDocuments: false,
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
