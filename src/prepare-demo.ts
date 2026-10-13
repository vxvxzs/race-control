import 'dotenv/config'
import { getPayloadClient } from './lib/payload'

// Curates known demo records without deleting accounts or result entries.
const payload = await getPayloadClient()
try {
  const users = await payload.find({ collection: 'users', pagination: false })
  const fictional = users.docs.filter((user) => user.demoAccount && user.name === 'Rafał Kubiak')
  const canonical = [...fictional].sort((a, b) => a.id - b.id)[0]
  for (const user of users.docs) {
    const duplicate = Boolean(
      user.demoAccount &&
      user.name === 'Rafał Kubiak' &&
      canonical &&
      user.id !== canonical.id &&
      (
        await payload.count({
          collection: 'results',
          where: { 'entries.driver': { equals: user.id } },
        })
      ).totalDocs === 0,
    )
    if (['Kamil QA Tester', 'dsad', 'ber'].includes(user.name) || duplicate) {
      await payload.update({ collection: 'users', id: user.id, data: { publicProfile: false } })
      console.log(`Hidden demo test/duplicate profile ${user.id} from roster`)
      const registrations = await payload.find({
        collection: 'registrations',
        where: {
          and: [
            { user: { equals: user.id } },
            { status: { in: ['pending', 'accepted'] } },
            { 'race.raceStatus': { equals: 'upcoming' } },
          ],
        },
        pagination: false,
      })
      for (const registration of registrations.docs) {
        await payload.update({
          collection: 'registrations',
          id: registration.id,
          data: { status: 'cancelled' },
          context: { skipEvents: true },
        })
        console.log(`Cancelled demo entry ${registration.id}; result history retained`)
      }
    }
    if (user.demoAccount && user.name === 'Robert Kubica') {
      await payload.update({ collection: 'users', id: user.id, data: { name: 'Rafał Kubiak' } })
      console.log(`Renamed fictional demo profile ${user.id}; sporting identity preserved`)
    }
  }
  const races = await payload.find({ collection: 'races', pagination: false })
  const endurance = races.docs.find((r) => r.slug === '10h-le-mans')
  if (endurance?.game === 'iRacing' && endurance.season === '2026/2027') {
    await payload.update({
      collection: 'races',
      id: endurance.id,
      data: { season: 'iRacing Endurance 2026' },
    })
    console.log('Separated iRacing 10H from ACC Sprint; round retained')
  }
  for (const race of races.docs.filter((r) => r.slug !== '10h-le-mans')) {
    await payload.update({
      collection: 'races',
      id: race.id,
      data: {
        round: race.round,
        ...(race.slug === 'imola-gt3'
          ? {
              format: 'Finał sezonu: kwalifikacje 20 min + wyścig 60 min (2 pitstopy)',
              regulations: 'Punktacja zgodnie z regulaminem sezonu. Dwa obowiązkowe pitstopy.',
            }
          : {}),
      },
    })
  }
  const titles: Record<string, string> = {
    'regulamin-sezon-2026-27': 'Regulamin sezonu GT3 Sprint Series 2026/27',
    'decyzje-sedziowskie-monza': 'Decyzje sędziowskie po rundzie 2: Monza',
    'briefing-runda-3-nurburgring': 'Briefing przed rundą 3: Nürburgring GP',
  }
  const announcements = await payload.find({ collection: 'announcements', pagination: false })
  for (const announcement of announcements.docs) {
    const title = titles[announcement.slug]
    if (title && title !== announcement.title) {
      await payload.update({ collection: 'announcements', id: announcement.id, data: { title } })
    }
  }
} finally {
  await payload.destroy()
}
process.exit(0)
