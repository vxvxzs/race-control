import 'dotenv/config'
import { rm } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
const postgresTest = process.env.TEST_POSTGRES === 'true'
if (postgresTest) {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.production.local', override: true, quiet: true })
} else {
  process.env.DATABASE_URL = 'file:./work/integration.db'
  await rm('work/integration.db', { force: true })
}
process.env.PAYLOAD_SECRET = randomBytes(32).toString('hex')
process.env.MAIL_MODE = 'preview'
process.env.PAYLOAD_DB_PUSH = postgresTest ? 'false' : 'true'
const { getPayloadClient } = await import('../src/lib/payload')
const { issueVerification, hashToken } = await import('../src/lib/verification')
const { consumeVerification } = await import('../src/lib/atomic')
const { processEmailOutbox } = await import('../src/lib/notifications')
const { calculateChampionshipStandings } = await import('../src/lib/standings')
const payload = await getPayloadClient()
if (postgresTest && (await payload.count({ collection: 'users' })).totalDocs)
  throw new Error('Postgres integration requires an empty pre-deployment database')
let checks = 0
function check(condition: unknown, label: string) {
  assert.ok(condition, label)
  checks++
  console.log(`PASS ${label}`)
}
async function rejected(action: () => Promise<unknown>, label: string) {
  let blocked = false
  try {
    await action()
  } catch {
    blocked = true
  }
  check(blocked, label)
}
try {
  const admin = await payload.create({
    collection: 'users',
    data: {
      email: 'admin@example.test',
      password: randomBytes(20).toString('hex'),
      name: 'Steward',
      role: 'admin',
      emailVerified: true,
    },
  })
  const driver = await payload.create({
    collection: 'users',
    data: {
      email: 'driver@example.test',
      password: 'IntegrationOnly-Driver123!',
      name: 'Żaneta Łuczak',
      role: 'driver',
    },
  })
  const other = await payload.create({
    collection: 'users',
    data: {
      email: 'other@example.test',
      password: randomBytes(20).toString('hex'),
      name: 'Inny Kierowca',
      role: 'driver',
      emailVerified: true,
    },
  })
  const authDriver = { ...driver, collection: 'users' as const }
  const race = await payload.create({
    collection: 'races',
    data: {
      name: 'QA Grand Prix',
      slug: 'qa-race',
      season: 'QA',
      round: 1,
      track: 'Nürburgring',
      date: '2026-10-25T19:00:00Z',
      brief: 'QA race',
      game: 'ACC',
      maxParticipants: 1,
      registrationStatus: 'open',
      raceStatus: 'upcoming',
      serverPassword: 'private-test-secret',
    },
  })
  const registration = {
    user: driver.id,
    race: race.id,
    status: 'pending' as const,
    carModel: 'Porsche GT3',
    racingNumber: 88,
    registeredAt: new Date().toISOString(),
  }
  await rejected(
    () => payload.create({ collection: 'registrations', data: registration }),
    'unverified account cannot register, even through Local API',
  )
  await payload.update({
    collection: 'users',
    id: driver.id,
    overrideAccess: false,
    user: authDriver,
    data: { role: 'admin', emailVerified: true, publicProfile: false },
  })
  const protectedDriver = await payload.findByID({ collection: 'users', id: driver.id })
  check(
    protectedDriver.role === 'driver' &&
      !protectedDriver.emailVerified &&
      protectedDriver.publicProfile !== false,
    'native fields protect role, verification and roster visibility',
  )
  await issueVerification(payload, driver.id)
  await rejected(() => issueVerification(payload, driver.id), 'resend throttled')
  const verification = (
    await payload.find({
      collection: 'email-outbox',
      where: { recipient: { equals: driver.email } },
      limit: 1,
    })
  ).docs[0]
  const token = new URL(verification.link!).searchParams.get('token')!
  check(
    (await consumeVerification(payload, hashToken(token))).length === 1,
    'valid verification activates account',
  )
  check((await consumeVerification(payload, hashToken(token))).length === 0, 'token single use')
  await payload.update({
    collection: 'users',
    id: driver.id,
    data: {
      emailVerified: false,
      verificationHash: hashToken('expired'),
      verificationExpires: '2020-01-01T00:00:00Z',
    },
  })
  check(
    (await consumeVerification(payload, hashToken('expired'))).length === 0,
    'expired token rejected by database',
  )
  await payload.update({ collection: 'users', id: driver.id, data: { emailVerified: true } })
  const reg = await payload.create({ collection: 'registrations', data: registration })
  check(reg.status === 'pending', 'registration saved')
  check(
    (
      await payload.count({
        collection: 'notifications',
        where: { recipient: { equals: admin.id } },
      })
    ).totalDocs === 1,
    'administrator notified by real collection event',
  )
  await rejected(
    () => payload.create({ collection: 'registrations', data: registration }),
    'duplicate registration blocked',
  )
  await rejected(
    () =>
      payload.create({
        collection: 'races',
        data: { ...race, id: undefined, slug: 'duplicate-round' },
      }),
    'duplicate season-round blocked',
  )
  await rejected(
    () =>
      payload.update({
        collection: 'registrations',
        id: reg.id,
        overrideAccess: false,
        user: authDriver,
        data: { status: 'accepted' },
      }),
    'driver cannot approve own entry',
  )
  await rejected(
    () =>
      payload.create({
        collection: 'users',
        overrideAccess: false,
        data: {
          name: 'Attacker',
          email: 'attacker@example.test',
          password: 'Attack-Password123!',
          role: 'admin',
        },
      }),
    'public role escalation blocked',
  )
  await rejected(
    () => payload.find({ collection: 'users', overrideAccess: false, user: undefined }),
    'public accounts private',
  )
  const publicRaces = await payload.find({
    collection: 'races',
    overrideAccess: false,
    user: undefined,
  })
  check(!publicRaces.docs[0].serverPassword, 'server password hidden from public collection')
  await payload.update({ collection: 'registrations', id: reg.id, data: { status: 'accepted' } })
  const notices = await payload.find({
    collection: 'notifications',
    overrideAccess: false,
    user: authDriver,
    depth: 0,
  })
  check(
    notices.docs.some((n) => n.type === 'registration_accepted'),
    'driver acceptance notification persisted',
  )
  check(
    notices.docs.every((n) => Number(n.recipient) === driver.id),
    'driver sees only own notifications',
  )
  const adminNotice = (
    await payload.find({
      collection: 'notifications',
      where: { recipient: { equals: admin.id } },
      limit: 1,
    })
  ).docs[0]
  await rejected(
    () =>
      payload.update({
        collection: 'notifications',
        id: adminNotice.id,
        overrideAccess: false,
        user: authDriver,
        data: { read: true },
      }),
    'cannot read another user notification',
  )
  const countBefore = (await payload.count({ collection: 'notifications' })).totalDocs
  await payload.update({ collection: 'registrations', id: reg.id, data: { status: 'accepted' } })
  check(
    (await payload.count({ collection: 'notifications' })).totalDocs === countBefore,
    'repeated acceptance produces no duplicate',
  )
  const regOther = await payload.create({
    collection: 'registrations',
    data: { ...registration, user: other.id, racingNumber: 12 },
  })
  await rejected(
    () =>
      payload.update({
        collection: 'registrations',
        id: regOther.id,
        data: { status: 'accepted' },
      }),
    'capacity enforced from CMS path',
  )
  const result = await payload.create({
    collection: 'results',
    data: {
      race: race.id,
      status: 'published',
      entries: [{ driver: driver.id, position: 1, finishStatus: 'dnf', classified: true }],
    },
  })
  check(
    (await payload.findByID({ collection: 'races', id: race.id })).raceStatus === 'completed',
    'CMS publication marks race completed',
  )
  check(
    (
      await payload.find({
        collection: 'notifications',
        where: { type: { equals: 'results_published' } },
      })
    ).totalDocs === 1,
    'results notify participants',
  )
  await payload.update({
    collection: 'results',
    id: result.id,
    data: { entries: result.entries, status: 'published' },
  })
  check(
    (
      await payload.find({
        collection: 'notifications',
        where: { type: { equals: 'results_published' } },
      })
    ).totalDocs === 1,
    'republishing identical results deduplicates event',
  )
  const toStanding = async () => {
    const r = await payload.findByID({ collection: 'results', id: result.id, depth: 1 })
    return calculateChampionshipStandings([
      {
        raceId: String(race.id),
        raceName: race.name,
        round: race.round,
        track: race.track,
        date: race.date,
        status: r.status,
        entries: r.entries.map((e) => ({
          driverId: String(typeof e.driver === 'object' ? e.driver.id : e.driver),
          driverName: typeof e.driver === 'object' ? e.driver.name : 'Kierowca',
          position: e.position,
          finishStatus: e.finishStatus,
          classified: e.classified !== false,
          penaltyPoints: e.penaltyPoints || 0,
        })),
      },
    ])[0]
  }
  check((await toStanding()).totalPoints === 25, 'classified DNF has 25 points after reload')
  await payload.update({
    collection: 'results',
    id: result.id,
    data: { entries: [{ driver: driver.id, position: 1, finishStatus: 'dnf', classified: false }] },
  })
  check(
    (await toStanding()).totalPoints === 0,
    'steward decision recalculates standings after reload',
  )
  await rejected(
    () =>
      payload.update({
        collection: 'results',
        id: result.id,
        overrideAccess: false,
        user: authDriver,
        data: { status: 'draft' },
      }),
    'driver cannot modify results',
  )
  const failureMail = await payload.create({
    collection: 'email-outbox',
    data: {
      key: 'failure-test',
      recipient: 'fail@example.test',
      subject: 'Test',
      message: 'Test',
      status: 'pending',
    },
  })
  await processEmailOutbox(payload, async () => {
    throw new Error('Simulated provider failure')
  })
  check(
    (await payload.findByID({ collection: 'registrations', id: reg.id })).status === 'accepted',
    'mail failure does not roll back entry',
  )
  const failed = await payload.findByID({ collection: 'email-outbox', id: failureMail.id })
  check(
    failed.status === 'pending' && failed.attempts === 1 && Boolean(failed.nextAttempt),
    'failure records status and bounded retry',
  )
  await payload.update({
    collection: 'email-outbox',
    id: failureMail.id,
    data: { nextAttempt: '2000-01-01T00:00:00Z' },
  })
  await processEmailOutbox(payload, async () => 'preview')
  check(
    (await payload.findByID({ collection: 'email-outbox', id: failureMail.id })).status ===
      'preview',
    'controlled retry succeeds once',
  )
  await payload.update({
    collection: 'notifications',
    id: notices.docs[0].id,
    overrideAccess: false,
    user: authDriver,
    data: { read: true },
  })
  check(
    (await payload.findByID({ collection: 'notifications', id: notices.docs[0].id })).read,
    'read state survives reload',
  )
  await payload.update({
    collection: 'registrations',
    id: regOther.id,
    data: { status: 'rejected' },
  })
  check(
    (
      await payload.count({
        collection: 'notifications',
        where: {
          and: [{ recipient: { equals: other.id } }, { type: { equals: 'registration_rejected' } }],
        },
      })
    ).totalDocs === 1,
    'rejected registration notifies driver',
  )
  const acceptedNotice = notices.docs[0]
  await payload.update({
    collection: 'notifications',
    id: acceptedNotice.id,
    overrideAccess: false,
    user: authDriver,
    data: { message: 'Tampered', recipient: admin.id, read: true },
  })
  const immutableNotice = await payload.findByID({
    collection: 'notifications',
    id: acceptedNotice.id,
    depth: 0,
  })
  check(
    immutableNotice.message !== 'Tampered' && Number(immutableNotice.recipient) === driver.id,
    'notification content and owner immutable to recipient',
  )
  await payload.update({
    collection: 'registrations',
    id: regOther.id,
    data: { status: 'cancelled' },
  })
  check(
    (
      await payload.count({
        collection: 'notifications',
        where: {
          and: [
            { recipient: { equals: admin.id } },
            { type: { equals: 'registration_cancelled' } },
          ],
        },
      })
    ).totalDocs === 1,
    'cancellation notifies administrators',
  )
  let deliveries = 0
  const concurrent = await payload.create({
    collection: 'email-outbox',
    data: {
      key: 'concurrent-test',
      recipient: 'concurrent@example.test',
      subject: 'Concurrent test',
      message: 'Test',
      status: 'pending',
    },
  })
  const sender = async (mail: { id: number }) => {
    if (mail.id === concurrent.id) deliveries++
    return 'preview' as const
  }
  await Promise.all([processEmailOutbox(payload, sender), processEmailOutbox(payload, sender)])
  check(deliveries === 1, 'concurrent mail workers claim a delivery only once')
  const twoSlotRace = await payload.create({
    collection: 'races',
    data: {
      name: 'Two slots',
      slug: 'two-slots',
      season: 'SLOTS',
      round: 1,
      track: 'Monza',
      date: '2026-11-08T19:00:00Z',
      brief: 'Slot regression',
      game: 'ACC',
      maxParticipants: 2,
      registrationStatus: 'open',
      raceStatus: 'upcoming',
    },
  })
  const slotA = await payload.create({
    collection: 'registrations',
    data: { ...registration, race: twoSlotRace.id, user: driver.id },
  })
  const slotB = await payload.create({
    collection: 'registrations',
    data: { ...registration, race: twoSlotRace.id, user: other.id, racingNumber: 12 },
  })
  await payload.update({ collection: 'registrations', id: slotA.id, data: { status: 'accepted' } })
  await payload.update({ collection: 'registrations', id: slotB.id, data: { status: 'accepted' } })
  const slots = await payload.find({
    collection: 'registrations',
    showHiddenFields: true,
    depth: 0,
    where: { race: { equals: twoSlotRace.id } },
  })
  check(
    new Set(slots.docs.map((d) => d.gridSlot)).size === 2 &&
      slots.docs.every((d) => d.status === 'accepted'),
    'multiple accepted drivers reserve different hidden grid slots',
  )
  const reviewer = await payload.create({
    collection: 'users',
    data: {
      name: 'Reviewer',
      email: 'reviewer@example.test',
      password: randomBytes(20).toString('hex'),
      role: 'admin',
      reviewerAccess: true,
      emailVerified: true,
    },
  })
  const authReviewer = { ...reviewer, collection: 'users' as const }
  await rejected(
    () =>
      payload.findByID({
        collection: 'users',
        id: admin.id,
        user: authReviewer,
        overrideAccess: false,
      }),
    'reviewer cannot read owner account',
  )
  await rejected(
    () =>
      payload.update({
        collection: 'users',
        id: admin.id,
        data: { password: randomBytes(20).toString('hex') },
        user: authReviewer,
        overrideAccess: false,
      }),
    'reviewer cannot reset owner password',
  )
  await rejected(
    () => payload.find({ collection: 'email-outbox', user: authReviewer, overrideAccess: false }),
    'reviewer cannot read private email tokens',
  )
  await payload.update({
    collection: 'users',
    id: reviewer.id,
    data: { reviewerAccess: false, disabled: false },
    user: authReviewer,
    overrideAccess: false,
  })
  const restricted = await payload.findByID({ collection: 'users', id: reviewer.id })
  check(restricted.reviewerAccess === true, 'reviewer cannot remove own restrictions')
  console.log(`Integration: ${checks} checks passed`)
} finally {
  if (postgresTest) {
    for (const collection of [
      'results',
      'registrations',
      'notifications',
      'email-outbox',
      'announcements',
      'races',
      'users',
    ] as const)
      await payload.delete({
        collection,
        where: { id: { greater_than: 0 } },
        context: { skipEvents: true },
      })
    console.log('Pre-deployment Postgres integration fixtures removed.')
  }
  await payload.destroy()
}

process.exit(0)
