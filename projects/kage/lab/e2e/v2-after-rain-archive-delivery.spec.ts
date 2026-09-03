import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

type ScentSnapshot = {
  ready: boolean
  progress: number
  chapter: string
  chapterNumber: string
  tone: string
  pointerEnergy: number
  frames: number
  dialogOpen: boolean
  reducedMotion: boolean
  fallback: boolean
  horizontalOverflow: boolean
  visualRevision: string
}

declare global {
  interface Window {
    __afterRainArchive?: { snapshot: () => ScentSnapshot; openArchive: () => void }
  }
}

const route = '/pages/v2/deliveries/after-rain-archive/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'r119-form-diversity')

test.describe.configure({ timeout: 35_000 })

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true })
})

function observeRuntimeErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

async function waitUntilReady(page: Page) {
  await page.waitForFunction(() => (
    document.documentElement.dataset.afterRainReady === 'true'
    && window.__afterRainArchive?.snapshot().ready === true
  ))
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__afterRainArchive!.snapshot())
}

test('desktop opening is a full-bleed editorial story, not a persistent workbench', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${route}?quality=high&motion=full&revision=r119-proof`)
  await waitUntilReady(page)
  await page.waitForTimeout(450)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    chapter: '雨后开场',
    chapterNumber: '00',
    tone: 'night',
    fallback: false,
    horizontalOverflow: false,
    visualRevision: 'r119-editorial-proof',
  })
  await expect(page.getByRole('heading', { name: /雨后.*气味档案/ })).toBeVisible()
  await expect(page.locator('.hero-image')).toBeVisible()
  await expect(page.locator('input[type="range"], .control-panel, .live-reading')).toHaveCount(0)
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('scent-memory-environment-v1.png')))).toBe(true)

  await page.screenshot({
    path: resolve(evidenceDir, '01-desktop-opening.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})

test('scroll and pointer move through the editorial chapters without exposing parameter controls', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${route}?quality=high&motion=full&revision=r119-proof`)
  await waitUntilReady(page)

  const asphalt = page.locator('.memory--asphalt')
  await asphalt.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => window.__afterRainArchive?.snapshot().chapter === '柏油与路灯')
  const beforePointer = await snapshot(page)
  await page.mouse.move(270, 300)
  await page.mouse.move(930, 520, { steps: 8 })
  await page.waitForFunction((before) => window.__afterRainArchive!.snapshot().pointerEnergy > before, beforePointer.pointerEnergy)

  const after = await snapshot(page)
  expect(after.progress).toBeGreaterThan(.2)
  expect(after.chapter).toBe('柏油与路灯')
  expect(after.pointerEnergy).toBeGreaterThan(beforePointer.pointerEnergy)
  await expect(page.locator('input[type="range"], .control-panel')).toHaveCount(0)

  await page.screenshot({
    path: resolve(evidenceDir, '02-desktop-mid-scroll.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})

test('the final editorial action opens and closes one contextual archive sheet', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=full&revision=r119-proof`)
  await waitUntilReady(page)

  const action = page.locator('[data-enter]')
  await action.scrollIntoViewIfNeeded()
  await action.click()
  await expect(page.locator('[data-dialog]')).toBeVisible()
  await expect(page.locator('[data-entry-status]')).toContainText('已开启')
  expect((await snapshot(page)).dialogOpen).toBe(true)
  await page.screenshot({
    path: resolve(evidenceDir, '03-desktop-core-action.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  await page.locator('[data-close]').click()
  await expect(page.locator('[data-dialog]')).toBeHidden()
  await expect(action).toBeFocused()
  expect(runtimeErrors).toEqual([])
})

test('390px reduced-motion and forced canvas fallback preserve the reading journey', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?fallback=canvas&revision=r119-proof`)
  await waitUntilReady(page)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    reducedMotion: true,
    fallback: true,
    frames: 0,
    horizontalOverflow: false,
  })
  await expect(page.locator('.scent-canvas')).toBeHidden()
  await expect(page.locator('[data-fallback-message]')).toContainText('完整档案仍可继续阅读')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
  const action = page.locator('[data-enter]')
  await action.scrollIntoViewIfNeeded()
  await expect(action).toBeVisible()
  await action.click()
  await expect(page.locator('[data-dialog]')).toBeVisible()

  await page.screenshot({
    path: resolve(evidenceDir, '04-mobile-reduced-fallback.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})
