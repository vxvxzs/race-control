import { validateRound } from '../lib/league-hooks'
import { adminField } from '../lib/access'
import type { CollectionConfig } from 'payload'

export const Races: CollectionConfig = {
  slug: 'races',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['round', 'name', 'track', 'date', 'registrationStatus', 'raceStatus'],
  },
  access: {
    read: ({ req }) => (req.user?.role === 'admin' ? true : { isPublished: { equals: true } }),
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: { beforeValidate: [validateRound] },
  fields: [
    { name: 'season', type: 'text', defaultValue: '2026/2027', label: 'Sezon' },
    {
      name: 'roundKey',
      type: 'text',
      unique: true,
      hidden: true,
      access: { read: () => false, create: () => false, update: () => false },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nazwa wyścigu',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug URL (np. spa-gt3)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'round',
      min: 1,
      type: 'number',
      required: true,
      label: 'Numer rundy (np. 1, 2, 3)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'track',
      type: 'text',
      required: true,
      label: 'Tor wyścigowy',
      admin: {
        description:
          'Wspólne zdjęcie i plan rozpoznajemy z nazwy: Spa-Francorchamps, Monza, Nürburgring GP, Le Mans / Circuit de la Sarthe, Silverstone, Imola. Katalog i licencje: src/lib/tracks.ts.',
      },
    },
    {
      name: 'trackCountry',
      type: 'text',
      label: 'Kraj toru',
      defaultValue: 'Belgia',
    },
    {
      name: 'trackLength',
      type: 'text',
      label: 'Długość pętli toru (np. 7.004 km)',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Termin wyścigu (data i czas startu)',
    },
    {
      name: 'game',
      type: 'text',
      required: true,
      defaultValue: 'Assetto Corsa Competizione',
      label: 'Platforma / Gra',
    },
    {
      name: 'format',
      type: 'text',
      label: 'Format zawodów (np. Kwali 15 min + Wyścig 45 min)',
      defaultValue: 'Kwalifikacje 15 min + Wyścig 45 min (obowiązkowy pitstop)',
    },
    {
      name: 'maxParticipants',
      min: 1,
      max: 200,
      type: 'number',
      required: true,
      defaultValue: 24,
      label: 'Maksymalna liczba uczestników (sloty na serwerze)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'registrationStatus',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Zapisy otwarte', value: 'open' },
        { label: 'Zapisy zamknięte', value: 'closed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'raceStatus',
      type: 'select',
      required: true,
      defaultValue: 'upcoming',
      options: [
        { label: 'Nadchodzący', value: 'upcoming' },
        { label: 'Zakończony', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'weather',
      type: 'text',
      label: 'Prognoza pogody w sesji',
      defaultValue: 'Sucho, temp. powietrza 22°C, asfalt 29°C, wiatr 4 km/h',
    },
    {
      name: 'brief',
      type: 'textarea',
      required: true,
      label: 'Opis wydarzenia i harmonogram',
    },
    {
      name: 'regulations',
      type: 'textarea',
      label: 'Regulamin szczególny rundy (zasady incydentów, limit toru itp.)',
    },
    {
      name: 'serverPassword',
      access: { read: adminField },
      type: 'text',
      label: 'Hasło do serwera (widoczne dla zaakceptowanych kierowców)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: true,
      label: 'Opublikowany publicznie',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
