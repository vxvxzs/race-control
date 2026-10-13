import type { Where } from 'payload'
export const activeSeason = process.env.ACTIVE_SEASON || '2026/2027'
export const publishedResults: Where = {
  and: [{ status: { equals: 'published' } }, { 'race.isPublished': { equals: true } }],
}
export const championshipResults: Where = {
  and: [
    publishedResults,
    { or: [{ 'race.season': { equals: activeSeason } }, { 'race.season': { exists: false } }] },
  ],
}
