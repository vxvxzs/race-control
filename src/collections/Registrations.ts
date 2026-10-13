import { adminOnly } from '../lib/access'
import { validateRegistration, registrationEvents } from '../lib/league-hooks'
import type { CollectionConfig } from 'payload'

export const Registrations: CollectionConfig = {
  slug: 'registrations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['race', 'user', 'racingNumber', 'carModel', 'status', 'registeredAt'],
  },
  access: {
    read: ({ req }) =>
      req.user?.role === 'admin' ? true : req.user ? { user: { equals: req.user.id } } : false,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: { beforeValidate: [validateRegistration], afterChange: [registrationEvents] },
  fields: [
    { name: 'activeKey', type: 'text', unique: true, hidden: true },
    { name: 'gridKey', type: 'text', unique: true, hidden: true },
    { name: 'gridSlot', type: 'number', hidden: true },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Kierowca',
    },
    {
      name: 'race',
      type: 'relationship',
      relationTo: 'races',
      required: true,
      label: 'Wyścig',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Oczekuje na weryfikację', value: 'pending' },
        { label: 'Zaakceptowano', value: 'accepted' },
        { label: 'Odrzucono', value: 'rejected' },
        { label: 'Anulowano przez kierowcę', value: 'cancelled' },
      ],
      access: {
        update: ({ req: { user }, data }) => {
          // Admin can change to any status
          if (user?.role === 'admin') return true
          // User can only cancel
          return data?.status === 'cancelled'
        },
      },
    },
    {
      name: 'carModel',
      type: 'text',
      required: true,
      label: 'Pojazd (np. Ferrari 296 GT3, BMW M4 GT3)',
    },
    {
      name: 'racingNumber',
      type: 'number',
      required: true,
      label: 'Numer startowy',
      min: 1,
      max: 999,
    },
    {
      name: 'registeredAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Data i czas zgłoszenia',
    },
    {
      name: 'adminNote',
      type: 'textarea',
      label: 'Notatka sędziego / administratora (np. powód odrzucenia)',
    },
  ],
}
