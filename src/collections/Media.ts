import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req: { user } }) => !process.env.VERCEL && user?.role === 'admin',
    update: ({ req: { user } }) => !process.env.VERCEL && user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  // Demo uses versioned, licensed static assets; no ephemeral server uploads.
  // Enable a persistent storage adapter before allowing upload creation.
  upload: { disableLocalStorage: Boolean(process.env.VERCEL) },
}
