import { chromium } from '@playwright/test'

const siteRoot = process.argv[2]
if (!siteRoot) {
  throw new Error('Usage: node scripts/verify-pages-release.mjs <pages-root-url>')
}

const projectRoot = new URL('projects/kage/', siteRoot).href
const caseIds = [
  'dedicated-ba4e9d10caaa-depth-field',
  'dedicated-r36-delivery-final',
  'dedicated-896cfb7e6657',
  'dedicated-1edb98865f4c',
  'dedicated-8574ee46ab16',
  'dedicated-1b9f0b05107b',
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const failures = []

page.on('pageerror', (error) => failures.push('pageerror: ' + error.message))
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().startsWith(projectRoot)) {
    failures.push(response.status() + ' ' + response.url())
  }
})

async function open(relative, assertion) {
  const url = new URL(relative, projectRoot).href
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  if (!response?.ok()) failures.push('navigation failed: ' + url)
  await page.waitForTimeout(1_800)
  await assertion(url)
  console.log('verified ' + url)
}

await open('./', async (url) => {
  if (!(await page.getByRole('heading', { name: /说出想法/ }).count())) {
    failures.push('missing project heading: ' + url)
  }
})

await open('v1/', async (url) => {
  const count = await page.locator('.case-card').count()
  if (count !== caseIds.length) failures.push('expected 6 V1 cards, found ' + count + ': ' + url)
})

await open('v2/', async (url) => {
  if (!(await page.getByRole('heading', { name: /不是让模型/ }).count())) {
    failures.push('missing V2 heading: ' + url)
  }
})

for (const id of caseIds) {
  await open('v1/case.html?id=' + id + '&quality=high&motion=full', async (url) => {
    const canvasCount = await page.locator('canvas').count()
    const errorCount = await page.locator('.case-error').count()
    if (!canvasCount || errorCount) failures.push('archived case did not start: ' + url)
  })
}

await browser.close()

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Kage Pages acceptance passed.')

