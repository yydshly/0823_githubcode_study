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
  const showcaseCount = await page.locator('.showcase-card').count()
  if (showcaseCount !== 3) failures.push('expected 3 workbench samples, found ' + showcaseCount + ': ' + url)
  const unloadedImages = await page.locator('.showcase-card img, .case-card img').evaluateAll((images) =>
    images.filter((image) => !(image instanceof HTMLImageElement) || image.naturalWidth === 0).length,
  )
  if (unloadedImages) failures.push('V1 contains ' + unloadedImages + ' unloaded preview images: ' + url)
})

await open('v2/', async (url) => {
  if (!(await page.getByRole('heading', { name: /不是让模型/ }).count())) {
    failures.push('missing V2 heading: ' + url)
  }
})

for (const experience of ['resonance-flagship', 'tidal-archive', 'chromatic-tide']) {
  await open('v1/showcase/?experience=' + experience + '&quality=high&motion=full', async (url) => {
    const activeExperience = await page.locator('body').getAttribute('data-experience')
    const canvasCount = await page.locator('canvas').count()
    if (activeExperience !== experience || !canvasCount) {
      failures.push('workbench sample did not start as ' + experience + ': ' + url)
    }
  })
}

for (const id of caseIds) {
  await open('v1/case.html?id=' + id + '&quality=high&motion=full', async (url) => {
    const canvasCount = await page.locator('canvas').count()
    const errorCount = await page.locator('.case-error').count()
    if (!canvasCount || errorCount) failures.push('archived case did not start: ' + url)
  })
}

await page.setViewportSize({ width: 390, height: 844 })
await open('v1/', async (url) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  if (overflow) failures.push('mobile V1 has horizontal overflow: ' + url)
  if ((await page.locator('.showcase-card').count()) !== 3 || (await page.locator('.case-card').count()) !== 6) {
    failures.push('mobile V1 is missing entries: ' + url)
  }
})

await browser.close()

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Kage Pages acceptance passed.')
