import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const base = process.env.QA_BASE_URL || 'https://race-control-rho.vercel.app'
const names = ['Jakub', 'jakub', 'JAKUB', 'Jakub Jałocha', 'Jakub123', 'Łukasz', 'Żaneta Świątek']
const reports: unknown[] = []
for (const engine of ['chrome', 'msedge', 'brave']) {
  const browser = await chromium.launch({
    headless: process.env.QA_HEADED !== 'true',
    ...(engine === 'brave'
      ? { executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' }
      : { channel: engine }),
    args: ['--disable-extensions'],
  })
  let unexpectedDisconnect = false
  browser.on('disconnected', () => {
    unexpectedDisconnect = true
  })
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
    })
    const page = await context.newPage()
    const errors: string[] = [],
      requests: string[] = []
    let crashed = false
    page.on('crash', () => {
      crashed = true
    })
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(base + '/register', { waitUntil: 'networkidle' })
    page.on('request', (request) => requests.push(new URL(request.url()).pathname))
    for (const name of names) {
      await page.locator('#register-name').fill('')
      await page.locator('#register-name').pressSequentially(name, { delay: 90 })
      await page.waitForTimeout(100)
      assert.equal(await page.locator('#register-name').inputValue(), name)
      assert.equal(crashed, false)
      assert.equal(unexpectedDisconnect, false)
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(requests, [])
    reports.push({
      engine,
      version: browser.version(),
      mobile,
      names,
      crashed,
      errors,
      typingRequests: requests,
      scope: 'fresh isolated profile, extensions disabled; no form submission',
    })
    await context.close()
  }
  await browser.close()
}
await mkdir('work', { recursive: true })
await writeFile(
  process.env.QA_NAME_REPORT || 'work/register-name-browser.json',
  JSON.stringify({ base, reports }, null, 2),
)
console.log(
  `PASS: ${reports.length} browser/view combinations, ${names.length} names each; no crash, JS error or typing request.`,
)
