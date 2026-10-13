import { publishedResults } from '../lib/season'
import { validateResults, resultEvents } from '../lib/league-hooks'
import type { CollectionConfig } from 'payload'

export const Results: CollectionConfig = {
  slug: 'results',
  admin: {
    useAsTitle: 'race',
    defaultColumns: ['race', 'status', 'publishedAt'],
  },
  access: {
    read: ({ req }) => (req.user?.role === 'admin' ? true : publishedResults),
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: { beforeValidate: [validateResults], afterChange: [resultEvents] },
  fields: [
    {
      name: 'race',
      type: 'relationship',
      relationTo: 'races',
      required: true,
      unique: true,
      label: 'Wyścig',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Wersja robocza (ukryta przed tabelą)', value: 'draft' },
        { label: 'Opublikowane (uwzględniane w klasyfikacji)', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Data zatwierdzenia i publikacji wyników',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'entries',
      type: 'array',
      required: true,
      label: 'Klasyfikacja końcowa wyścigu',
      fields: [
        {
          name: 'driver',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Kierowca',
        },
        {
          name: 'position',
          type: 'number',
          required: true,
          min: 1,
          label: 'Pozycja na mecie (P1, P2...)',
        },
        {
          name: 'finishStatus',
          type: 'select',
          required: true,
          defaultValue: 'finished',
          options: [
            { label: 'Ukończył (Finished)', value: 'finished' },
            { label: 'Nie ukończył (DNF)', value: 'dnf' },
            { label: 'Dyskwalifikacja (DSQ)', value: 'dsq' },
          ],
          label: 'Status ukończenia',
        },
        {
          name: 'classified',
          type: 'checkbox',
          defaultValue: true,
          label: 'Sklasyfikowany (DNF może otrzymać punkty)',
        },
        {
          name: 'gap',
          type: 'text',
          label: 'Strata do zwycięzcy (np. LEADER, +2.341s, +1 Lap)',
        },
        {
          name: 'bestLap',
          type: 'text',
          label: 'Najlepszy czas okrążenia (np. 2:17.382)',
        },
        {
          name: 'penaltyPoints',
          min: 0,
          type: 'number',
          defaultValue: 0,
          label: 'Punkty karne (odejmowane od dorobku)',
        },
        {
          name: 'note',
          type: 'text',
          label: 'Notatka sędziowska / decyzja stewardów',
        },
      ],
    },
  ],
}
