import { adminField, privateField } from '../lib/access'
import { APIError } from 'payload'
import type { CollectionConfig, AccessResult } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'racingNumber'],
  },
  auth: { tokenExpiration: 60 * 60 * 24, maxLoginAttempts: 5, lockTime: 600000 },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.disabled) throw new APIError('Konto jest nieaktywne.', 403)
        return user
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (originalDoc?.id && data.email && data.email !== originalDoc.email)
          throw new APIError('Zmiana e-maila wymaga osobnego procesu weryfikacji.', 400)
        return data
      },
    ],
  },
  access: {
    read: ({ req }): AccessResult =>
      req.user?.role === 'admin' && !req.user.reviewerAccess
        ? true
        : req.user?.reviewerAccess
          ? {
              or: [
                { id: { equals: req.user.id } },
                { and: [{ demoAccount: { equals: true } }, { role: { equals: 'driver' } }] },
              ],
            }
          : req.user
            ? { id: { equals: req.user.id } }
            : false,
    create: ({ req }) => req.user?.role === 'admin' && !req.user.reviewerAccess,
    update: ({ req: { user } }): AccessResult => {
      if (!user) return false
      if (user.role === 'admin' && !user.reviewerAccess) return true
      if (user.reviewerAccess)
        return {
          or: [
            { id: { equals: user.id } },
            { and: [{ demoAccount: { equals: true } }, { role: { equals: 'driver' } }] },
          ],
        }
      return {
        id: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) => user?.role === 'admin' && !user.reviewerAccess,
    admin: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'disabled',
      type: 'checkbox',
      defaultValue: false,
      access: { create: adminField, update: adminField },
    },
    {
      name: 'reviewerAccess',
      type: 'checkbox',
      defaultValue: false,
      label: 'Temporary reviewer (restricted accounts and outbox)',
      access: { create: adminField, update: adminField },
    },
    {
      name: 'publicProfile',
      label: 'Widoczny na publicznej liście kierowców',
      type: 'checkbox',
      defaultValue: true,
      access: { create: adminField, update: adminField },
    },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: adminField, update: adminField },
    },
    ...['verificationHash', 'verificationExpires', 'verificationSentAt'].map((name) => ({
      name,
      type: 'text' as const,
      hidden: true,
      access: { read: () => false, create: () => false, update: () => false },
    })),
    {
      name: 'demoAccount',
      type: 'checkbox',
      defaultValue: false,
      access: { create: adminField, update: adminField },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nazwa kierowcy',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'driver',
      options: [
        { label: 'Kierowca', value: 'driver' },
        { label: 'Administrator', value: 'admin' },
      ],
      access: {
        create: adminField,
        update: adminField,
      },
    },
    {
      name: 'racingNumber',
      type: 'number',
      label: 'Numer startowy',
      min: 1,
      max: 999,
    },
    {
      name: 'team',
      type: 'text',
      label: 'Zespół / Ekipa',
    },
    {
      name: 'favoriteCar',
      type: 'text',
      label: 'Główny samochód (np. Porsche 992 GT3 R)',
    },
    {
      name: 'steamId',
      access: { read: privateField },
      type: 'text',
      label: 'Steam ID / ACC GUID',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'O kierowcy',
    },
  ],
}
