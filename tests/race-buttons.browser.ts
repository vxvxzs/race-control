import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { chromium, type Page } from '@playwright/test'

const output = resolve(process.env.QA_BUTTONS_OUTPUT || 'work/race-buttons')
await mkdir(output, { recursive: true })
await mkdir('work', { recursive: true })
process.env.DATABASE_URL = `file:./work/buttons-${randomBytes(8).toString('hex')}.db`
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
const fixtures = [
  ['open', 'upcoming', 'open', 24],
  ['closed', 'upcoming', 'closed', 24],
  ['full', 'upcoming', 'open', 1],
  ['published', 'completed', 'closed', 24],
  ['draft', 'completed', 'closed', 24],
] as const
const driver = await payload.create({
  collection: 'users',
  data: {
    name: 'Button driver',
    email: 'button@example.test',
    password: randomBytes(24).toString('hex'),
    role: 'driver',
    emailVerified: true,
  },
})
for (const [index, [slug, raceStatus, registrationStatus, maxParticipants]] of fixtures.entries()) {
  const race = await payload.create({
    collection: 'races',
    data: {
      name: slug,
      slug,
      track: `Circuit ${slug}`,
      trackCountry: 'Polska',
      season: '2026/2027',
      round: index + 1,
      game: 'ACC',
      brief: 'Isolated calendar fixture',
      date: new Date(Date.now() + (index + 10) * 86400000).toISOString(),
      raceStatus,
      registrationStatus,
      maxParticipants,
      isPublished: true,
    },
  })
  if (slug === 'full')
    await payload.create({
      collection: 'registrations',
      context: { skipEvents: true },
      data: {
        user: driver.id,
        race: race.id,
        status: 'accepted',
        carModel: 'GT3',
        racingNumber: 1,
        registeredAt: new Date().toISOString(),
      },
    })
  if (slug === 'published' || slug === 'draft')
    await payload.create({
      collection: 'results',
      context: { skipEvents: true },
      data: {
        race: race.id,
        status: slug === 'published' ? 'published' : 'draft',
        entries: [{ driver: driver.id, position: 1, finishStatus: 'finished', classified: true }],
      },
    })
}
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
  {
    env: {
      ...process.env,
      PAYLOAD_DB_PUSH: 'false',
      NEXT_PUBLIC_SERVER_URL: base,
      NODE_ENV: 'production',
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
async function motion(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const fill = el.querySelector('.race-button__fill')!
    const matrix = new DOMMatrix(getComputedStyle(fill).transform)
    return { x: matrix.m41, skew: matrix.m21, width: fill.getBoundingClientRect().width }
  })
}
try {
  let ready = false
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  assert(ready, serverLog)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: resolve(output, 'video'), size: { width: 1440, height: 1000 } },
  })
  context.setDefaultTimeout(15000)
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base)
  const row = (slug: string) =>
    page
      .locator('.schedule-row')
      .filter({ has: page.locator(`.schedule-track[href="/races/${slug}"]`) })
  assert.equal(
    await row('open').locator('.race-button').getAttribute('href'),
    '/races/open#registration',
  )
  assert.equal(
    await row('published').locator('.race-button').getAttribute('href'),
    '/results/published',
  )
  for (const [slug, text] of [
    ['closed', 'Zapisy zamknięte'],
    ['full', 'Lista startowa pełna'],
    ['draft', 'Wyniki w przygotowaniu'],
  ]) {
    assert.equal(await row(slug).locator('.race-button').count(), 0)
    assert.equal(await row(slug).locator('.schedule-closed').innerText(), text)
  }
  assert.equal(await page.locator('a a').count(), 0)
  pass(
    'CMS: published results, open registration, closed, full and unpublished results; no nested links',
  )
  await page.locator('.hero-actions .race-button').hover()
  await page.waitForTimeout(450)
  assert.equal(
    await page
      .locator('.hero-actions .race-button')
      .evaluate((el) => getComputedStyle(el).transform),
    'none',
  )
  const refreshed = page.waitForResponse((response) =>
    response.url().endsWith('/api/races/upcoming'),
  )
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  assert.equal((await refreshed).status(), 200)
  await page.waitForTimeout(100)
  assert(Math.abs((await motion(page, '.hero-actions .race-button')).x) < 0.1)
  pass('React rerender after availability refresh preserves active hover')
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  const selector = '.schedule-action .race-button--outline'
  const button = page.locator(selector)
  await button.scrollIntoViewIfNeeded()
  await page.waitForFunction(
    () =>
      document
        .querySelector('.schedule-action .race-button--outline')
        ?.getAttribute('data-motion') === 'true',
  )
  const bounds = () =>
    button.evaluate((el) => {
      const box = el.getBoundingClientRect()
      return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height }
    })
  await page.waitForTimeout(600) // Let the existing calendar row entrance settle.
  const before = await bounds()
  assert((await motion(page, selector)).x < -100)
  await button.hover()
  await page.waitForTimeout(450)
  const entered = await motion(page, selector)
  assert(Math.abs(entered.x) < 0.1)
  assert(Math.abs(entered.skew + Math.tan((18 * Math.PI) / 180)) < 0.001)
  assert.equal(await button.evaluate((el) => getComputedStyle(el).color), 'rgb(255, 255, 255)')
  assert.deepEqual(await bounds(), before)
  await page.screenshot({ path: resolve(output, 'desktop-hover.png'), fullPage: true })
  await page.mouse.move(1, 1)
  await page.waitForTimeout(340)
  assert((await motion(page, selector)).x > 100)
  pass('wipe enters from left, skew -18°, exits right, white label, unchanged layout')
  const trace: number[] = []
  for (let i = 0; i < 5; i++) {
    await button.hover()
    await page.waitForTimeout(70)
    trace.push((await motion(page, selector)).x)
    await page.mouse.move(1, 1)
    await page.waitForTimeout(100)
  }
  await button.hover()
  await page.waitForTimeout(450)
  assert(Math.abs((await motion(page, selector)).x) < 0.1)
  await page.mouse.move(1, 1)
  await page.waitForTimeout(340)
  assert((await motion(page, selector)).x > 100)
  await writeFile(resolve(output, 'rapid-hover-trace.json'), JSON.stringify(trace))
  pass('five interrupted hover/leave cycles settle without overlapping animations')
  await button.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await page.waitForTimeout(450)
  assert(await button.evaluate((el) => el.matches(':focus-visible')))
  assert(Math.abs((await motion(page, selector)).x) < 0.1)
  assert.equal(await button.evaluate((el) => getComputedStyle(el).outlineStyle), 'solid')
  await page.keyboard.press('Enter')
  await page.waitForURL('**/results/published')
  assert.equal((await page.request.get(base + '/results/published')).status(), 200)
  pass('keyboard focus/Enter opens the exact published protocol')
  await page.goto(base + '/calendar')
  assert.equal(await page.locator('.schedule-action .race-button').count(), 2)
  await page.locator('.schedule-action .race-button--solid').click()
  await page.waitForURL('**/races/open#registration')
  assert(await page.locator('#registration').isVisible())
  pass('calendar registration action reaches the existing race form')
  await page.goto(base + '/login')
  await page.locator('input[type="email"]').fill('button@example.test')
  await page.locator('input[type="password"]').fill('dummy-password')
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/auth/login', async (route) => {
    await gate
    await route.fulfill({ status: 401, json: { error: 'Test response' } })
  })
  const submit = page.locator('button[type="submit"]')
  await submit.click()
  await page.waitForFunction(
    () => document.querySelector('button[type="submit"]')?.getAttribute('aria-busy') === 'true',
  )
  assert(await submit.isDisabled())
  assert.equal(await submit.getAttribute('data-motion'), null)
  release()
  await page.waitForFunction(
    () => !document.querySelector('button[type="submit"]')?.hasAttribute('disabled'),
  )
  pass('loading freezes submit, clears animation and restores interaction after request')
  await page.goto(base + '/verify-email')
  assert(await page.locator('button.race-button').isDisabled())
  assert.equal(await page.locator('button.race-button').getAttribute('data-motion'), null)
  pass('disabled verification action has no motion')
  await context.close()
  for (const width of [320, 390, 768]) {
    const mobile = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: width < 640,
    })
    const p = await mobile.newPage()
    p.on('pageerror', (error) => errors.push(error.message))
    await p.goto(base)
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    for (const action of await p.locator('.schedule-action .race-button').all()) {
      await action.scrollIntoViewIfNeeded()
      await p.waitForTimeout(500)
      const bounds = await action.boundingBox()
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width)
      const track = await action.locator('xpath=../..').locator('.schedule-track').boundingBox()
      assert(track && (bounds.x >= track.x + track.width || bounds.y >= track.y + track.height))
    }
    if (width === 390) {
      await p.evaluate(() => window.scrollTo(0, 0))
      await p.waitForTimeout(400)
      await p.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true })
      await p.locator('.schedule-action .race-button--solid').tap()
      await p.waitForURL('**/races/open#registration')
    }
    pass(`touch/mobile ${width}px: no overflow, no overlap, working action`)
    await mobile.close()
  }
  const reduced = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  })
  const p = await reduced.newPage()
  await p.goto(base)
  const ghost = p.locator('.schedule-action .race-button--outline')
  await ghost.hover()
  assert.equal(await ghost.getAttribute('data-motion'), null)
  assert.equal(
    await ghost.locator('.race-button__fill').evaluate((el) => getComputedStyle(el).display),
    'none',
  )
  assert.equal(await ghost.evaluate((el) => getComputedStyle(el).color), 'rgb(255, 255, 255)')
  assert.notEqual(
    await ghost.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)',
  )
  pass('reduced motion uses static CSS hover with readable label')
  await p.emulateMedia({ reducedMotion: 'no-preference' })
  await p.waitForFunction(
    () =>
      document
        .querySelector('.schedule-action .race-button--outline')
        ?.getAttribute('data-motion') === 'true',
  )
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.waitForFunction(
    () =>
      !document
        .querySelector('.schedule-action .race-button--outline')
        ?.hasAttribute('data-motion'),
  )
  pass('live reduced-motion preference changes clean up GSAP')
  const fallback = await browser.newContext()
  const staticPage = await fallback.newPage()
  await staticPage.goto(base)
  const staticButton = staticPage.locator('.schedule-action .race-button--outline')
  await staticPage.waitForFunction(
    () =>
      document
        .querySelector('.schedule-action .race-button--outline')
        ?.getAttribute('data-motion') === 'true',
  )
  await staticButton.evaluate((element) => {
    // Simulate static markup with no animation handlers, retaining the actual CSS and href.
    const clone = element.cloneNode(true) as HTMLElement
    clone.removeAttribute('data-motion')
    clone.querySelector('.race-button__fill')?.removeAttribute('style')
    element.replaceWith(clone)
  })
  await staticButton.hover()
  assert.equal(
    await staticButton.locator('.race-button__fill').evaluate((el) => getComputedStyle(el).display),
    'none',
  )
  assert.notEqual(
    await staticButton.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)',
  )
  await staticButton.click()
  await staticPage.waitForURL('**/results/published')
  pass('static button without animation handlers: CSS hover and native navigation work')
  await fallback.close()
  assert.deepEqual(errors, [])
  pass('no browser JavaScript errors')
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify({ checks, errors, isolatedDatabase: true }, null, 2),
  )
  console.log(`${checks.length} button checks passed`)
} finally {
  await browser.close()
  child.kill()
  await payload.destroy()
  await writeFile(resolve(output, 'server.log'), serverLog)
}
process.exit(0)
