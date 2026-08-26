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
  const workbenchHref = await page.getByRole('link', { name: '打开工作台' }).getAttribute('href')
  if (!workbenchHref?.endsWith('./workbench.html')) failures.push('missing project workbench entry: ' + url)
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
  const workbenchHref = await page.getByRole('link', { name: '打开工作台' }).getAttribute('href')
  if (!workbenchHref?.endsWith('../workbench.html')) failures.push('missing V1 workbench entry: ' + url)
})

await open('workbench.html', async (url) => {
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready', null, { timeout: 20_000 })
  if (!(await page.getByRole('heading', { name: '说出你想看到的网页' }).count())) {
    failures.push('missing public workbench heading: ' + url)
  }
  if ((await page.locator('#provider').inputValue()) !== 'local') {
    failures.push('public workbench did not select local provider: ' + url)
  }
  const enabledRemoteProviders = await page.locator('#provider option:not([value="local"]):not(:disabled)').count()
  if (enabledRemoteProviders) failures.push('public workbench exposes unavailable remote providers: ' + url)
  if (!(await page.locator('#public-workbench-note').isVisible())) {
    failures.push('public workbench boundary note is not visible: ' + url)
  }

  const previousRunId = await page.evaluate(() => window.__creativeLab?.snapshot().runId)
  await page.locator('#brief').fill('为雨夜阅读者设计一段安静、克制、随滚动逐渐亮起的空间叙事。')
  await page.locator('#generate').click()
  await page.waitForFunction((prior) => {
    const snapshot = window.__creativeLab?.snapshot()
    return snapshot?.state === 'ready' && snapshot.runId && snapshot.runId !== prior
  }, previousRunId, { timeout: 20_000 })
  const generatedFrame = await page.locator('#creative-stage-frame').getAttribute('src')
  if (!generatedFrame?.includes('/v1/showcase/') || !generatedFrame.includes('generated=')) {
    failures.push('public workbench did not load its generated result in the V1 runtime: ' + url)
  }

  const sampleLinks = page.locator('.wb-sample-link')
  if ((await sampleLinks.count()) !== 2) failures.push('public workbench is missing its two primary sample links: ' + url)
  const sampleHref = await sampleLinks.first().getAttribute('href')
  if (!sampleHref?.includes('/v1/showcase/') || !sampleHref.includes('experience=resonance-flagship')) {
    failures.push('public workbench sample uses the wrong runtime route: ' + url)
  }
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

await open('workbench.html', async (url) => {
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready', null, { timeout: 20_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  if (overflow) failures.push('mobile workbench has horizontal overflow: ' + url)
  if (!(await page.locator('#generate').isVisible()) || !(await page.locator('#public-workbench-note').isVisible())) {
    failures.push('mobile workbench is missing its primary action or public boundary: ' + url)
  }
})

await browser.close()

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Kage Pages acceptance passed.')
