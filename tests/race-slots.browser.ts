import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { chromium, type Page } from '@playwright/test'

const development = process.env.QA_SLOTS_DEV === 'true'
const output = resolve(process.env.QA_SLOTS_OUTPUT || 'work/race-slots')
await mkdir(output, { recursive: true })
await mkdir('work', { recursive: true })
process.env.DATABASE_URL = `file:./work/slots-${randomBytes(8).toString('hex')}.db`
process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
process.env.PAYLOAD_DB_PUSH = 'true'
process.env.MAIL_MODE = 'preview'
const { getPayloadClient } = await import('../src/lib/payload')
const payload = await getPayloadClient()
const port = await new Promise<number>((resolvePort) => {
  const server = createServer()
  server.listen(0, '127.0.0.1', () => {
    const port = (server.address() as { port: number }).port
    server.close(() => resolvePort(port))
  })
})
const base = `http://localhost:${port}`
const raceData = {
  season: '2026/2027',
  game: 'ACC',
  brief: 'Isolated slots test',
  maxParticipants: 24,
  isPublished: true,
  registrationStatus: 'open' as const,
  raceStatus: 'upcoming' as const,
}
const race = await payload.create({
  collection: 'races',
  data: {
    ...raceData,
    name: 'Slots fixture',
    slug: 'slots-fixture',
    track: 'Nürburgring GP',
    round: 1,
    date: new Date(Date.now() + 12 * 86400000).toISOString(),
  },
})
const next = await payload.create({
  collection: 'races',
  data: {
    ...raceData,
    name: 'Next fixture',
    slug: 'next-fixture',
    track: 'Monza',
    round: 2,
    date: new Date(Date.now() + 26 * 86400000).toISOString(),
  },
})
const registrations: number[] = []
for (let index = 0; index < 24; index++) {
  const user = await payload.create({
    collection: 'users',
    data: {
      name: `Slots driver ${index}`,
      email: `slots-${index}@example.test`,
      password: randomBytes(24).toString('hex'),
      role: 'driver',
      emailVerified: true,
      demoAccount: true,
    },
  })
  const entry = await payload.create({
    collection: 'registrations',
    context: { skipEvents: true },
    data: {
      user: user.id,
      race: race.id,
      status: index < 7 ? 'accepted' : 'pending',
      carModel: 'GT3',
      racingNumber: index + 1,
      registeredAt: new Date().toISOString(),
    },
  })
  registrations.push(entry.id)
}
const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    development ? 'dev' : 'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    env: {
      ...process.env,
      PAYLOAD_DB_PUSH: 'false',
      NEXT_PUBLIC_SERVER_URL: base,
      NODE_ENV: development ? 'development' : 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)
let serverLog = ''
child.stdout.on('data', (data) => {
  serverLog += data
})
child.stderr.on('data', (data) => {
  serverLog += data
})
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const checks: string[] = [],
  errors: string[] = []
const pass = (label: string) => {
  checks.push(label)
  console.log('PASS ' + label)
}
async function inspect(page: Page, taken: number) {
  await page.locator('.slots').waitFor()
  assert.equal(await page.locator('.slots__seg').count(), 24)
  assert.equal(await page.locator('.slots__seg.is-taken').count(), taken)
  assert.equal(await page.locator('.slots').getAttribute('aria-valuenow'), String(24 - taken))
  await page.waitForFunction(
    (free) => document.querySelector('[data-count]')?.textContent === String(free),
    24 - taken,
  )
  await page.waitForFunction(() => {
    const accent = getComputedStyle(document.querySelector('.slots__tick')!).backgroundColor
    return [...document.querySelectorAll('.slots__seg.is-taken')].every(
      (el) => getComputedStyle(el).backgroundColor === accent,
    )
  })
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLElement>('.slots__seg')].every(
      (segment) => !segment.style.backgroundColor,
    ),
  )
}
async function refresh(page: Page) {
  const response = page.waitForResponse((r) => r.url().endsWith('/api/races/upcoming'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  assert.equal((await response).status(), 200)
}
async function setTaken(taken: number) {
  for (const [index, id] of registrations.entries())
    await payload.update({
      collection: 'registrations',
      id,
      context: { skipEvents: true },
      data: { status: index < taken ? 'accepted' : 'pending' },
    })
}
try {
  let ready = false
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  assert(ready, 'isolated server ready')
  const record = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: resolve(output, 'video'), size: { width: 1440, height: 1000 } },
  })
  await record.addInitScript(() => {
    const trace: Array<{ value: number; actual: string | null; time: number }> = []
    Object.assign(window, { slotTrace: trace })
    let last: string | null = null
    new MutationObserver(() => {
      const number = document.querySelector('[data-count]')
      const value = number?.textContent ?? null
      if (value !== null && value !== last) {
        last = value
        trace.push({
          value: Number(value),
          actual: document.querySelector('.slots')?.getAttribute('aria-valuenow') ?? null,
          time: performance.now(),
        })
      }
    }).observe(document, { childList: true, subtree: true })
  })
  const page = await record.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base)
  await inspect(page, 7)
  const trace = await page.evaluate(
    () => (window as unknown as { slotTrace: Array<{ value: number; actual: string }> }).slotTrace,
  )
  const start = trace.findIndex((frame) => frame.value === 24)
  assert(start >= 0, 'entry starts with full pool')
  assert.deepEqual(
    trace.slice(start).map((frame) => frame.value),
    [24, 23, 22, 21, 20, 19, 18, 17],
  )
  assert(
    trace.every((frame) => frame.actual === '17'),
    'accessible value remains truthful during visual countdown',
  )
  const geometry = await page.locator('.slots__bar').evaluate((el) => ({
    height: getComputedStyle(el).height,
    gap: getComputedStyle(el).gap,
    transform: getComputedStyle(el).transform,
  }))
  assert.equal(geometry.height, '22px')
  assert.equal(geometry.gap, '3px')
  assert(geometry.transform.includes('-0.32492'))
  assert.equal(await page.locator('.hero-availability .slot-meter').count(), 0)
  assert.equal(await page.getByText('Zapisy otwarte', { exact: true }).count(), 1)
  pass(
    `${development ? 'Strict Mode development' : 'production'}: 7/24, exact geometry, sequential count and truthful ARIA`,
  )
  await page.screenshot({ path: resolve(output, 'desktop-7-of-24.png'), fullPage: true })
  await page.locator('.slots').screenshot({ path: resolve(output, 'slots-7-of-24.png') })
  await writeFile(resolve(output, 'entry-trace.json'), JSON.stringify(trace, null, 2))
  await record.close()
  if (!development) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const live = await context.newPage()
    live.on('pageerror', (error) => errors.push(error.message))
    await live.goto(base)
    await inspect(live, 7)
    const snapshot = await (await live.request.get(base + '/api/races/upcoming')).json()
    assert.deepEqual(Object.keys(snapshot.race).sort(), [
      'acceptedCount',
      'maxParticipants',
      'raceStatus',
      'registrationStatus',
      'slug',
    ])
    pass('public upcoming endpoint returns only availability and event identity')
    await live.evaluate(() => {
      Object.assign(window, { slotUpdates: [] })
      new MutationObserver(() => {
        const number = document.querySelector('[data-count]')
        if (number)
          (window as unknown as { slotUpdates: number[] }).slotUpdates.push(
            Number(number.textContent),
          )
      }).observe(document.querySelector('.slots')!, { childList: true, subtree: true })
    })
    for (const taken of [8, 0, 7, 23, 24]) {
      await setTaken(taken)
      await refresh(live)
      await inspect(live, taken)
      assert.equal(
        await live.locator('.slots__status').innerText(),
        taken === 24 ? 'Lista pełna' : 'Zapisy otwarte',
      )
      if (taken === 8) {
        const values = await live.evaluate(
          () => (window as unknown as { slotUpdates: number[] }).slotUpdates,
        )
        assert(values.length > 0 && values.every((value) => value <= 17 && value >= 16))
        pass('approval update transitions directly to 16 free places without replaying the intro')
      }
      if (taken === 0) {
        const segment = live.locator('.slots__seg.is-free').first()
        await segment.hover()
        assert.equal(
          await segment.evaluate((el) => getComputedStyle(el).backgroundColor),
          'rgba(255, 255, 255, 0.4)',
        )
        await live.mouse.move(1, 1)
        pass('freed segments retain the reference hover after an animated update')
      }
      pass(`backend update ${taken}/24; pending entries do not reserve places`)
    }
    await payload.update({
      collection: 'races',
      id: race.id,
      data: { registrationStatus: 'closed' },
    })
    await refresh(live)
    await live.getByText('Zapisy zamknięte', { exact: true }).waitFor()
    assert.equal(await live.getByText('Zapisy otwarte', { exact: true }).count(), 0)
    pass('closed registrations never show open status')
    await setTaken(7)
    await payload.update({ collection: 'races', id: race.id, data: { registrationStatus: 'open' } })
    await refresh(live)
    await inspect(live, 7)
    await payload.update({ collection: 'races', id: race.id, data: { maxParticipants: 16 } })
    await refresh(live)
    await live.waitForFunction(
      () =>
        document.querySelectorAll('.slots__seg').length === 16 &&
        document.querySelector('[data-count]')?.textContent === '9',
    )
    assert.equal(await live.locator('.slots').getAttribute('aria-valuemax'), '16')
    pass('capacity comes from Payload: 7/16 creates 16 segments and 9 free places')
    await payload.update({ collection: 'races', id: race.id, data: { maxParticipants: 24 } })
    await refresh(live)
    await inspect(live, 7)
    for (const width of [320, 390, 768]) {
      await live.setViewportSize({ width, height: 1000 })
      assert(await live.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.equal(await live.locator('.slots__seg').count(), 24)
      await live.screenshot({ path: resolve(output, `responsive-${width}.png`), fullPage: true })
      pass(`all segments and no horizontal overflow at ${width}px`)
    }
    await payload.update({
      collection: 'races',
      id: race.id,
      data: { raceStatus: 'completed', registrationStatus: 'closed' },
    })
    await refresh(live)
    await live.locator('.hero-event h2').filter({ hasText: 'Monza' }).waitFor()
    await inspect(live, 0)
    pass('nearest event switches to the next real Payload race')
    await payload.update({
      collection: 'races',
      id: next.id,
      data: { raceStatus: 'completed', registrationStatus: 'closed' },
    })
    await refresh(live)
    await live.getByText('Kalendarz następnego sezonu pojawi się tutaj.', { exact: true }).waitFor()
    assert.equal(await live.locator('.slots').count(), 0)
    pass('no upcoming races: existing empty state, no fictitious slots')
    await payload.update({
      collection: 'races',
      id: next.id,
      data: { raceStatus: 'upcoming', registrationStatus: 'open' },
    })
    await refresh(live)
    await inspect(live, 0)
    pass('new upcoming event appears from the empty state')
    for (const id of registrations.slice(0, 7)) {
      const source = await payload.findByID({ collection: 'registrations', id, depth: 0 })
      await payload.create({
        collection: 'registrations',
        context: { skipEvents: true },
        data: {
          user: typeof source.user === 'number' ? source.user : source.user.id,
          race: next.id,
          status: 'accepted',
          carModel: 'GT3',
          racingNumber: source.racingNumber,
          registeredAt: new Date().toISOString(),
        },
      })
    }
    const reduced = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    })
    const reducedPage = await reduced.newPage()
    reducedPage.on('pageerror', (error) => errors.push(error.message))
    await reducedPage.goto(base)
    await inspect(reducedPage, 7)
    assert.equal(await reducedPage.locator('[data-count]').innerText(), '17')
    assert.equal(await reducedPage.locator('.slots__seg[style]').count(), 0)
    pass('reduced motion: correct final state without segment animation')
  }
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify({ checks, errors, isolatedDatabase: true }, null, 2),
  )
  console.log(`${checks.length} slots checks passed`)
} finally {
  await browser.close()
  child.kill()
  await payload.destroy()
  await writeFile(resolve(output, 'server.log'), serverLog)
}
process.exit(0)
