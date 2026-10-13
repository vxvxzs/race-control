import { chromium, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const base = process.env.QA_BASE_URL || 'http://localhost:3000'
const routes = [
  '/',
  '/calendar',
  '/standings',
  '/drivers',
  '/rules',
  '/results',
  '/results/spa-gt3',
  '/results/monza-gt3',
  '/races/nurburgring-gt3',
  '/races/spa-gt3',
  '/races/monza-gt3',
  '/races/silverstone-gt3',
  '/races/10h-le-mans',
  '/login',
  '/register',
  '/verify-email',
  '/credits',
]
await mkdir('work', { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const checks: { label: string; route?: string; status?: number; overflow?: boolean }[] = []
const errors: string[] = []
const failedAssets: string[] = []
function watch(page: Page) {
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text() + ' ' + message.location().url)
  })
}
try {
  const page = await browser.newPage()
  watch(page)
  page.on('response', (r) => {
    if (r.status() >= 400 && ['image', 'stylesheet', 'script'].includes(r.request().resourceType()))
      failedAssets.push(r.url())
  })
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height })
    for (const route of routes) {
      const response = await page.goto(base + route)
      await page.waitForTimeout(1000)
      await page.locator('footer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(600)
      if (label === 'mobile' && route === '/standings')
        await page.locator('.mobile-standings summary').first().click()
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({
        path: `work/after-${label}-${route.replaceAll('/', '_')}.png`,
        fullPage: true,
      })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      assert.equal(response?.status(), 200, route)
      assert.equal(overflow, false, label + route)
      checks.push({ label, route, status: response?.status(), overflow })
    }
  }
  await page.getByRole('button', { name: 'Otwórz menu' }).click()
  assert(await page.getByRole('navigation', { name: 'Nawigacja mobilna' }).isVisible())
  await page
    .getByRole('navigation', { name: 'Nawigacja mobilna' })
    .getByRole('link', { name: 'Kalendarz', exact: true })
    .click()
  await page.waitForURL(base + '/calendar')
  assert.equal(await page.getByRole('navigation', { name: 'Nawigacja mobilna' }).count(), 0)
  checks.push({ label: 'mobile menu navigates and closes' })
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of ['/', '/races/nurburgring-gt3', '/register', '/standings']) {
      await page.goto(base + route)
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route + width,
      )
    }
    checks.push({ label: 'extra width ' + width + ' has no page overflow' })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(base + '/races/nurburgring-gt3')
  const toggle = page.getByRole('button', { name: 'Widok płaski', exact: true })
  await toggle.focus()
  await page.keyboard.press('Enter')
  assert.equal(
    await page
      .getByRole('button', { name: 'Widok przestrzenny', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  )
  checks.push({ label: 'circuit view supports keyboard' })
  const reduce = await browser.newContext({ reducedMotion: 'reduce' })
  const reducedPage = await reduce.newPage()
  watch(reducedPage)
  await reducedPage.goto(base + '/races/nurburgring-gt3')
  assert.equal(
    await reducedPage.locator('.circuit-plane').evaluate((el) => getComputedStyle(el).transform),
    'none',
  )
  assert.equal(
    await reducedPage.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    ),
    0,
  )
  checks.push({ label: 'reduced motion keeps circuit static and suppresses decorative animation' })
  await reducedPage.screenshot({ path: 'work/reduced-motion-race.png', fullPage: true })
  const noJS = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJS.newPage()
  watch(staticPage)
  await staticPage.goto(base)
  assert(await staticPage.locator('.hero-title h1').isVisible())
  assert.equal(
    await staticPage.locator('.hero-title').evaluate((el) => getComputedStyle(el).opacity),
    '1',
  )
  checks.push({ label: 'public hero remains visible without JavaScript' })
  const motionContext = await browser.newContext()
  const motionPage = await motionContext.newPage()
  watch(motionPage)
  await motionPage.addInitScript(() => {
    const native = Element.prototype.animate
    Object.assign(window, { heroReveals: 0 })
    Element.prototype.animate = function (...args) {
      if (this.hasAttribute('data-hero-reveal')) {
        const target = window as unknown as { heroReveals: number }
        target.heroReveals++
      }
      return native.apply(this, args)
    }
  })
  await motionPage.goto(base)
  await motionPage.waitForTimeout(1300)
  const first = await motionPage.evaluate(
    () => (window as unknown as { heroReveals: number }).heroReveals,
  )
  assert(first > 0)
  await motionPage
    .getByRole('navigation', { name: 'Nawigacja główna', exact: true })
    .getByRole('link', { name: 'Kalendarz', exact: true })
    .click()
  await motionPage.waitForURL(base + '/calendar')
  await motionPage.getByRole('link', { name: 'Race Control, strona główna', exact: true }).click()
  await motionPage.waitForURL(base + '/')
  await motionPage.waitForTimeout(1000)
  assert.equal(
    await motionPage.evaluate(() => (window as unknown as { heroReveals: number }).heroReveals),
    first,
  )
  checks.push({ label: 'client navigation back to home does not replay hero reveal' })
  // Exercise the real countdown at an elapsed time, without modifying stored race dates.
  await motionPage.clock.install({ time: new Date('2026-11-01T00:00:00Z') })
  await motionPage.goto(base + '/races/nurburgring-gt3')
  await motionPage.getByText('Termin startu minął', { exact: true }).waitFor()
  assert.equal(await motionPage.locator('.countdown-digits').count(), 0)
  checks.push({ label: 'elapsed countdown replaces digits with a stopped status' })
  assert.equal(errors.length, 0, errors.join('\n'))
  assert.equal(failedAssets.length, 0, failedAssets.join('\n'))
  await writeFile(
    'work/visual-checks.json',
    JSON.stringify({ checks, errors, failedAssets, total: checks.length }, null, 2),
  )
  console.log(`Visual/browser checks: ${checks.length} passed`)
} finally {
  await browser.close()
}
