import type { CollectionConfig } from 'payload'

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'date', 'isPinned'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tytuł komunikatu',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug URL',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'notice',
      options: [
        { label: 'Komunikat sędziowski', value: 'stewards' },
        { label: 'Oficjalny komunikat ligi', value: 'notice' },
        { label: 'Briefing przed wyścigiem', value: 'briefing' },
        { label: 'Zmiana w regulaminie', value: 'regulation' },
      ],
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Data publikacji',
    },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      label: 'Krótkie podsumowanie (zajawka)',
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: 'Treść komunikatu',
    },
    {
      name: 'isPinned',
      type: 'checkbox',
      defaultValue: false,
      label: 'Przypnij na górze strony',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
