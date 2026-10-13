import { readFile } from 'node:fs/promises'
import type { Config } from '../src/payload-types'

export const demoCollections = [
  'users',
  'races',
  'registrations',
  'results',
  'announcements',
  'notifications',
  'email-outbox',
  'media',
] as const
export type DemoExport = {
  [K in (typeof demoCollections)[number]]: Config['collections'][K][]
}

// This is an operator-created export, not an upload endpoint. Payload validates
// individual fields on import; reject missing collections/IDs before any changes.
export async function readDemoExport(): Promise<DemoExport> {
  const value: unknown = JSON.parse(await readFile('work/demo-export.json', 'utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid demo export')
  const data = value as Record<string, unknown>
  for (const collection of demoCollections) {
    const rows = data[collection]
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row: unknown) =>
          !row ||
          typeof row !== 'object' ||
          !('id' in row) ||
          typeof row.id !== 'number' ||
          !Number.isInteger(row.id) ||
          row.id < 1,
      )
    )
      throw new Error(`Invalid demo collection: ${collection}`)
  }
  return data as DemoExport
}

export function exportedRelation<T extends { id: number }>(rows: T[], relation: number | T): T {
  const id = typeof relation === 'number' ? relation : relation.id
  const row = rows.find((candidate) => candidate.id === id)
  if (!row) throw new Error('Demo export contains a missing relationship')
  return row
}
