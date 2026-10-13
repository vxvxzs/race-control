import type { CollectionConfig } from 'payload'
import { ownDocuments, adminOnly } from '../lib/access'
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: { useAsTitle: 'message', defaultColumns: ['recipient', 'type', 'read', 'createdAt'] },
  access: { read: ownDocuments, create: () => false, update: ownDocuments, delete: adminOnly },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: () => false },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      hidden: true,
      access: { read: () => false, update: () => false },
    },
    { name: 'type', type: 'text', required: true, access: { update: () => false } },
    { name: 'message', type: 'textarea', required: true, access: { update: () => false } },
    { name: 'link', type: 'text', access: { update: () => false } },
    { name: 'read', type: 'checkbox', defaultValue: false },
  ],
}
export const EmailOutbox: CollectionConfig = {
  slug: 'email-outbox',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['recipient', 'subject', 'status', 'attempts', 'lastError'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin' && !req.user.reviewerAccess,
    create: () => false,
    update: () => false,
    delete: ({ req }) => req.user?.role === 'admin' && !req.user.reviewerAccess,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'recipient', type: 'email', required: true },
    { name: 'subject', type: 'text', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'link', type: 'text' },
    { name: 'htmlBody', type: 'textarea', admin: { hidden: true } },
    {
      name: 'status',
      type: 'select',
      options: ['pending', 'sending', 'sent', 'preview', 'suppressed', 'failed'],
      defaultValue: 'pending',
      required: true,
      index: true,
    },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'nextAttempt', type: 'date' },
    { name: 'lastError', type: 'textarea' },
    {
      name: 'deliveredAt',
      type: 'date',
      admin: { description: 'Legacy field; provider acceptance is not inbox delivery.' },
    },
    { name: 'firstAttemptAt', type: 'date' },
    { name: 'acceptedAt', type: 'date', label: 'Provider acceptance (not delivery)' },
    { name: 'providerMessageId', type: 'text' },
  ],
}
