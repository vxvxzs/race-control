import { createServer } from 'node:net'
import { setDefaultResultOrder } from 'node:dns'
setDefaultResultOrder('ipv4first')
import 'dotenv/config'
import { chromium, type BrowserContext } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
process.env.DATABASE_URL = 'file:./work/http-test.db'
process.env.PAYLOAD_DB_PUSH = 'true'
process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
process.env.MAIL_MODE = 'preview'
process.env.MAIL_PREVIEW_DIR = 'work/http-mail'
await mkdir('work', { recursive: true })
await rm('work/http-test.db', { force: true })
const { getPayloadClient } = await import('../src/lib/payload')
const { processEmailOutbox } = await import('../src/lib/notifications')
const payload = await getPayloadClient()
const port = await new Promise<number>((resolve) => {
  const probe = createServer()
  probe.listen(0, '127.0.0.1', () => {
    const port = (probe.address() as { port: number }).port
    probe.close(() => resolve(port))
  })
})
const base = `http://localhost:${port}`
const adminPassword = randomBytes(24).toString('hex')
const admin = await payload.create({
  collection: 'users',
  data: {
    name: 'QA Steward',
    email: 'steward@example.test',
    password: adminPassword,
    role: 'admin',
    emailVerified: true,
  },
})
const race = await payload.create({
  collection: 'races',
  data: {
    name: 'Grand Prix QA',
    slug: 'qa-http-race',
    round: 99,
    season: '2026/2027',
    track: 'Nürburgring GP',
    date: '2026-10-25T19:00:00Z',
    brief: 'Test całego przepływu.',
    maxParticipants: 24,
    game: 'ACC',
    raceStatus: 'upcoming',
    registrationStatus: 'open',
    serverPassword: 'http-private-server-password',
  },
})
const otherRace = await payload.create({
  collection: 'races',
  data: {
    name: 'Drugi wyścig QA',
    slug: 'qa-other-race',
    round: 100,
    season: '2026/2027',
    track: 'Spa QA',
    brief: 'Osobne wydarzenie do sprawdzenia nawigacji.',
    date: '2026-11-25T19:00:00Z',
    maxParticipants: 24,
    game: 'ACC',
    raceStatus: 'upcoming',
    registrationStatus: 'open',
  },
})
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'],
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
let serverOutput = ''
child.stdout.on('data', (d) => (serverOutput += String(d)))
child.stderr.on('data', (d) => (serverOutput += String(d)))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const checks: string[] = [],
  errors: string[] = []
function check(c: unknown, label: string) {
  assert.ok(c, label)
  checks.push(label)
  console.log('PASS ' + label)
}
// APIRequestContext does not emit browser fetch metadata. Payload requires it
// when authenticating cookie requests without Origin; actual pages keep native headers.
function browserRequest(context: BrowserContext) {
  const request = context.request
  return {
    patch: (url: string, options: Parameters<typeof request.patch>[1] = {}) =>
      request.patch(url, {
        ...options,
        headers: { 'Sec-Fetch-Site': 'same-origin', ...options.headers },
      }),
    get: (url: string, options: Parameters<typeof request.get>[1] = {}) =>
      request.get(url, {
        ...options,
        headers: { 'Sec-Fetch-Site': 'same-origin', ...options.headers },
      }),
    post: (url: string, options: Parameters<typeof request.post>[1] = {}) =>
      request.post(url, {
        ...options,
        headers: { 'Sec-Fetch-Site': 'same-origin', ...options.headers },
      }),
  }
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
    await new Promise((r) => setTimeout(r, 1000))
  }
  check(ready, 'production HTTP test server ready')
  browser = await chromium.launch({ headless: true, channel: 'chrome' })
  // Payload checks browser fetch metadata when cookies authenticate HTTP requests.
  const driverContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await driverContext.newPage()
  const driverRequest = browserRequest(driverContext)
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(30000)
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base + '/register')
  await page.locator('#register-name').fill('Żaneta Łuczak QA')
  await page.locator('#register-email').fill('reviewer@example.test')
  await page.locator('#register-password').fill('OnlyForIsolatedTests-123!')
  await page.locator('#register-confirmPassword').fill('OnlyForIsolatedTests-123!')
  await page.locator('#register-racingNumber').fill('88')
  await page.locator('#register-team').fill('Race Control Review Team')
  await page.getByRole('button', { name: 'Zarejestruj się i dołącz' }).click()
  await page.waitForURL(base + '/account', { timeout: 30000 })
  check(
    await page.getByRole('heading', { name: 'Żaneta Łuczak QA' }).isVisible(),
    'registration form and automatic login work',
  )
  const me = await (await driverRequest.get(base + '/api/auth/me')).json(),
    id = me.user.id
  check(me.user.emailVerified === false, 'new account starts unverified')
  await page.goto(base + `/races/${race.slug}`)
  await page.getByText('Potwierdź swój adres e-mail przed startem.', { exact: true }).waitFor()
  check(true, 'unverified driver sees verification state instead of a registration form')
  let r = await driverRequest.post(base + `/api/races/${race.slug}/register`, {
    data: { carModel: 'Porsche 992 GT3 R', racingNumber: 88 },
  })
  check(r.status() === 403, 'HTTP unverified registration blocked')
  r = await driverRequest.post(base + '/api/auth/resend-verification')
  check(r.status() === 429, 'HTTP verification resend throttled')
  await processEmailOutbox(payload)
  const verification = (
    await payload.find({
      collection: 'email-outbox',
      where: { recipient: { equals: 'reviewer@example.test' } },
      limit: 1,
    })
  ).docs[0]
  check(verification.status === 'preview', 'real outbox worker writes local verification mail')
  const preview = JSON.parse(await readFile(`work/http-mail/${verification.id}.json`, 'utf8'))
  const token = new URL(preview.link).searchParams.get('token')!
  await page.goto(base + `/verify-email?token=${token}`)
  await page.getByRole('button', { name: 'Potwierdź adres', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Adres potwierdzony' }).waitFor()
  check(true, 'verification link activates account through UI')
  r = await driverRequest.post(base + '/api/auth/verify', { data: { token } })
  check(r.status() === 400, 'HTTP verification token cannot be reused')
  await page.goto(base + `/races/${race.slug}`)
  await page.getByRole('button', { name: 'Zapisz się na wyścig', exact: true }).waitFor()
  await page.locator('#race-number').fill('88')
  await page.waitForTimeout(16000)
  check(
    (await page.locator('#race-number').inputValue()) === '88',
    'background polling preserves unsent registration form',
  )
  const registrationResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/races/${race.slug}/register`) &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Zapisz się na wyścig', exact: true }).click()
  const submitted = await registrationResponse
  assert.ok(submitted.ok(), `Registration HTTP ${submitted.status()}: ${await submitted.text()}`)
  await page.locator('.sport-status').filter({ hasText: 'Oczekuje na decyzję stewardów' }).waitFor()
  const reg = (
    await payload.find({ collection: 'registrations', where: { user: { equals: id } }, limit: 1 })
  ).docs[0]
  check(reg.status === 'pending', 'race form persists registration in database')
  const adminNotices = await payload.find({
    collection: 'notifications',
    where: { recipient: { equals: admin.id } },
    depth: 0,
  })
  check(
    adminNotices.docs.some((n) => n.type === 'registration_new'),
    'administrator gets in-app event',
  )
  check(
    (
      await payload.count({
        collection: 'email-outbox',
        where: { recipient: { equals: admin.email } },
      })
    ).totalDocs === 1,
    'administrator email queued after actual registration',
  )
  r = await driverRequest.post(base + `/api/races/${race.slug}/register`, {
    data: { carModel: 'Porsche 992 GT3 R', racingNumber: 88 },
  })
  check(r.status() === 409, 'HTTP duplicate entry blocked')
  r = await driverRequest.post(base + `/api/admin/registrations/${reg.id}/status`, {
    data: { status: 'accepted' },
  })
  check(r.status() === 403, 'HTTP driver cannot approve own entry')
  r = await driverRequest.patch(base + `/api/registrations/${reg.id}`, {
    data: { status: 'accepted', user: admin.id },
  })
  check(r.status() === 403, 'native Payload endpoint cannot bypass registration authorization')
  r = await driverRequest.patch(base + `/api/users/${id}`, {
    data: { role: 'admin', emailVerified: true },
  })
  check(
    r.status() !== 200 || (await payload.findByID({ collection: 'users', id })).role === 'driver',
    'native Payload role escalation blocked',
  )
  const anonymous = await browser.newContext(),
    publicRequest = anonymous.request
  r = await publicRequest.get(base + '/api/users')
  check(r.status() === 403, 'native public users API blocked')
  r = await publicRequest.get(base + `/api/races/${race.id}`)
  check(!(await r.json()).serverPassword, 'native race API does not expose password')
  const html = await (await publicRequest.get(base + `/races/${race.slug}`)).text()
  check(
    !html.includes('http-private-server-password'),
    'server password absent from public HTML and hydration',
  )
  const snapshot = await (await publicRequest.get(base + `/api/races/${race.slug}/snapshot`)).json()
  check(
    snapshot.acceptedCount === 0 &&
      snapshot.maxParticipants === 24 &&
      Object.keys(snapshot).every((key) =>
        ['acceptedCount', 'maxParticipants', 'registrationStatus', 'raceStatus'].includes(key),
      ),
    'public grid snapshot exposes only aggregate race availability',
  )
  r = await publicRequest.get(base + `/api/races/${race.slug}/check-registration?userId=${id}`)
  check(r.status() === 401, 'registration status requires login')
  r = await driverRequest.get(
    base + `/api/races/${race.slug}/check-registration?userId=${admin.id}`,
  )
  check(r.status() === 403, 'IDOR lookup blocked')
  r = await driverRequest.post(base + '/api/notifications', {
    data: { id: adminNotices.docs[0].id },
  })
  check(r.status() === 403, 'cannot change another account notification through HTTP')
  r = await driverRequest.post(base + '/api/notifications', {
    data: '{',
    headers: { 'Content-Type': 'application/json' },
  })
  check(r.status() === 400, 'malformed notification JSON returns a controlled client error')
  r = await driverRequest.post(base + '/api/auth/login', {
    data: { email: 123, password: {} },
  })
  check(r.status() === 400, 'login rejects non-string credentials before authentication')
  r = await driverRequest.post(base + '/api/account/profile', {
    headers: { Origin: 'https://attacker.example' },
    data: { name: 'Attacker' },
  })
  check(r.status() === 403, 'cross-origin mutation blocked')
  const adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage()
  const adminRequest = browserRequest(adminContext)
  r = await adminRequest.post(base + '/api/auth/login', {
    data: { email: admin.email, password: adminPassword },
  })
  check(r.ok(), 'private admin login works')
  await adminPage.goto(base + `/races/${race.slug}`)
  await adminPage.getByRole('button', { name: 'Zatwierdź', exact: true }).click()
  await adminPage.getByText('Brak oczekujących zgłoszeń', { exact: false }).waitFor()
  check(
    (await payload.findByID({ collection: 'registrations', id: reg.id })).status === 'accepted',
    'steward approval button persists acceptance',
  )
  await page
    .locator('.sport-status')
    .filter({ hasText: 'Potwierdzony start' })
    .waitFor({ timeout: 25000 })
  await page.getByRole('meter').waitFor()
  await page.waitForFunction(
    () => document.querySelector('[role="meter"]')?.getAttribute('aria-valuenow') === '1',
  )
  check(true, 'approval and actual seat meter update without driver navigation')
  await page
    .getByRole('navigation', { name: 'Nawigacja główna', exact: true })
    .getByRole('link', { name: 'Kalendarz', exact: true })
    .click()
  await page.waitForURL(base + '/calendar')
  await page.locator('a[href="/races/qa-other-race"]').click()
  await page.waitForURL(base + '/races/qa-other-race')
  await page.getByRole('button', { name: 'Zapisz się na wyścig', exact: true }).waitFor()
  check(
    (await page.locator('.sport-status').filter({ hasText: 'Potwierdzony start' }).count()) === 0,
    'client navigation to another race does not carry previous registration state',
  )
  await page.goto(base + '/account')
  await page.getByText('Zaakceptowano', { exact: false }).first().waitFor()
  check(
    await page.getByText('http-private-server-password', { exact: true }).isVisible(),
    'driver sees status and private server credentials after reload',
  )
  await page.screenshot({ path: 'work/registered-desktop-account.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'work/registered-mobile-account.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: /Powiadomienia, nieprzeczytane/ }).click()
  await page.locator('#notification-list').waitFor()
  check(
    await page.locator('#notification-list').isVisible(),
    'notification bell opens persistent list',
  )
  await page
    .getByRole('button', { name: /Oznacz jako przeczytane/ })
    .first()
    .click()
  const unreadBefore = await (await driverRequest.get(base + '/api/notifications')).json()
  check(
    unreadBefore.notifications.some((n: { read: boolean }) => n.read),
    'read action persisted',
  )
  await page.screenshot({ path: 'work/after-desktop-account-notifications.png', fullPage: true })
  await page.keyboard.press('Escape')
  await page.reload()
  check(
    (await (await driverRequest.get(base + '/api/notifications')).json()).notifications.some(
      (n: { read: boolean }) => n.read,
    ),
    'read state survives browser refresh',
  )
  const entries = [
    { driver: id, position: 1, finishStatus: 'dnf', classified: true, penaltyPoints: 2 },
  ]
  r = await adminRequest.post(base + `/api/admin/results/${race.id}/publish`, {
    data: { status: 'published', entries },
  })
  check(r.ok(), 'admin publishes results through HTTP')
  const noticeCount = (
    await payload.count({
      collection: 'notifications',
      where: { type: { equals: 'results_published' } },
    })
  ).totalDocs
  check(noticeCount === 1, 'participant receives publication notification')
  r = await adminRequest.post(base + `/api/admin/results/${race.id}/publish`, {
    data: { status: 'published', entries },
  })
  check(
    r.ok() &&
      (
        await payload.count({
          collection: 'notifications',
          where: { type: { equals: 'results_published' } },
        })
      ).totalDocs === noticeCount,
    'HTTP republish has no duplicate notifications',
  )
  await page.goto(base + '/standings')
  check(
    (await page
      .getByRole('row')
      .filter({ hasText: 'Żaneta Łuczak QA' })
      .locator('.total-cell')
      .innerText()) === '23',
    'standings show classified DNF minus penalties',
  )
  await page.reload()
  check(
    (await page
      .getByRole('row')
      .filter({ hasText: 'Żaneta Łuczak QA' })
      .locator('.total-cell')
      .innerText()) === '23',
    'standings stable after refresh',
  )
  r = await adminRequest.post(base + `/api/admin/results/${race.id}/publish`, {
    data: { status: 'published', entries: [{ ...entries[0], classified: false }] },
  })
  check(r.ok(), 'steward can mark driver unclassified')
  await page.reload()
  check(
    (await page
      .getByRole('row')
      .filter({ hasText: 'Żaneta Łuczak QA' })
      .locator('.total-cell')
      .innerText()) === '0',
    'classification changes reflected in public table',
  )
  await processEmailOutbox(payload)
  check(
    (await payload.find({ collection: 'email-outbox', pagination: false })).docs.every(
      (m) => m.status === 'preview',
    ),
    'all transactional mails rendered locally, no real mailbox claimed',
  )
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(base + '/account')
    await page.getByRole('heading', { name: 'Żaneta Łuczak QA' }).waitFor()
    await page.screenshot({ path: `work/after-${label}-account.png`, fullPage: true })
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${label} driver career has no page overflow`,
    )
  }
  await page.goto(base + '/standings')
  await page.locator('.mobile-standings summary').first().click()
  check(
    await page.locator('.mobile-standings details[open] .mobile-round-results').isVisible(),
    'mobile standings expand individual race results',
  )
  await page.goto(base + '/account')
  await page.getByRole('button', { name: 'Edytuj profil' }).click()
  await page.locator('#profile-team').fill('Nowy Zespół QA')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await page.getByText('Dane kierowcy zapisane.').waitFor()
  check(
    (await payload.findByID({ collection: 'users', id })).team === 'Nowy Zespół QA',
    'profile edit remains functional',
  )
  r = await driverRequest.post(base + '/api/auth/logout')
  check(r.ok(), 'logout works')
  r = await driverRequest.post(base + '/api/auth/login', {
    data: { email: 'reviewer@example.test', password: 'OnlyForIsolatedTests-123!' },
  })
  check(r.ok(), 'driver logs back in')
  check(
    (await (await driverRequest.get(base + '/api/notifications')).json()).notifications.some(
      (n: { type: string }) => n.type === 'results_published',
    ),
    'notifications survive re-login',
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  const guestPage = await anonymous.newPage()
  await guestPage.goto(base + `/races/${otherRace.slug}`)
  await guestPage.getByRole('link', { name: 'Zaloguj się i dołącz', exact: true }).waitFor()
  check(
    await guestPage.getByRole('link', { name: 'Zaloguj się i dołącz', exact: true }).isVisible(),
    'anonymous visitor sees login registration state',
  )
  await payload.update({ collection: 'races', id: otherRace.id, data: { maxParticipants: 1 } })
  const gridBlock = await payload.create({
    collection: 'registrations',
    data: {
      race: otherRace.id,
      user: admin.id,
      status: 'accepted',
      carModel: 'BMW M4 GT3',
      racingNumber: 99,
      registeredAt: new Date().toISOString(),
    },
  })
  await page.goto(base + `/races/${otherRace.slug}`)
  await page.getByText(/Osiągnięto maksymalną liczbę uczestników/).waitFor()
  check(
    (await page.getByRole('button', { name: 'Zapisz się na wyścig', exact: true }).count()) === 0,
    'full grid shows capacity state and removes registration action',
  )
  await payload.update({
    collection: 'races',
    id: otherRace.id,
    data: { registrationStatus: 'closed' },
  })
  await page.reload()
  await page
    .getByText('Zapisy na ten wyścig zostały zamknięte przez administratora ligi.', { exact: true })
    .waitFor()
  check(true, 'closed registration has an explicit final state')
  await payload.update({
    collection: 'registrations',
    id: gridBlock.id,
    data: { status: 'cancelled' },
  })
  await payload.update({
    collection: 'races',
    id: otherRace.id,
    data: { registrationStatus: 'open' },
  })
  const stateEntry = await payload.create({
    collection: 'registrations',
    data: {
      race: otherRace.id,
      user: id,
      status: 'rejected',
      carModel: 'Porsche 992 GT3 R',
      racingNumber: 88,
      registeredAt: new Date().toISOString(),
      adminNote: 'Sprawdź numer startowy.',
    },
  })
  await page.goto(base + `/races/${otherRace.slug}`)
  await page.locator('.sport-status').filter({ hasText: 'Zgłoszenie odrzucone' }).waitFor()
  check(
    await page.getByText('Sprawdź numer startowy.', { exact: true }).isVisible(),
    'rejected entry displays the steward reason',
  )
  await payload.update({
    collection: 'registrations',
    id: stateEntry.id,
    data: { status: 'pending' },
  })
  await page.reload()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Anuluj zgłoszenie', exact: true }).click()
  await page.getByRole('button', { name: 'Zapisz się na wyścig', exact: true }).waitFor()
  check(
    (await payload.findByID({ collection: 'registrations', id: stateEntry.id })).status ===
      'cancelled',
    'driver cancellation restores registration form and persists status',
  )
  await payload.update({
    collection: 'races',
    id: race.id,
    data: { raceStatus: 'completed', registrationStatus: 'closed' },
  })
  await page.goto(base + `/races/${race.slug}`)
  await page
    .getByText('Wyścig zakończony. Sprawdź opublikowany protokół w zakładce Wyniki.', {
      exact: true,
    })
    .waitFor()
  check(true, 'completed race has a final event state')
  check(errors.length === 0, 'no browser JavaScript errors in complete workflow')
  await writeFile(
    'work/http-checks.json',
    JSON.stringify({ checks, errors, total: checks.length }, null, 2),
  )
  console.log(`HTTP/browser workflow: ${checks.length} checks passed`)
} catch (error) {
  await writeFile('work/http-server.log', serverOutput)
  throw error
} finally {
  await browser?.close()
  child.kill()
  await payload.destroy()
}

process.exit(0)
