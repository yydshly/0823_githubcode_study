import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

type KineticSnapshot = {
  ready: boolean
  activeBeat: number
  activeName: string
  direction: number
  energy: number
  duration: number
  wheelProgress: number
  pointer: { x: number; y: number }
  frames: number
  fallback: boolean
  reducedMotion: boolean
  horizontalOverflow: boolean
  saved: boolean
}

declare global {
  interface Window {
    __kineticScore?: {
      snapshot: () => KineticSnapshot
      selectBeat: (index: number) => void
    }
  }
}

const route = '/pages/v2/deliveries/kinetic-score/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'r116-kinetic-score')
const verifiedCoverPath = resolve(process.cwd(), 'pages', 'v2', 'assets', 'verified-examples', 'kinetic-score.jpg')

test.describe.configure({ timeout: 40_000 })

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
    document.documentElement.dataset.kineticScoreReady === 'true'
    && window.__kineticScore?.snapshot().ready === true
  ))
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__kineticScore!.snapshot())
}

async function sampledPixelDifference(before: Buffer, after: Buffer) {
  const [first, second] = await Promise.all([
    sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  expect(second.info).toMatchObject({
    width: first.info.width,
    height: first.info.height,
    channels: first.info.channels,
  })
  let changed = 0
  let samples = 0
  const stride = first.info.channels * 4
  for (let offset = 0; offset < first.data.length; offset += stride) {
    samples += 1
    const delta = Math.max(
      Math.abs(first.data[offset] - second.data[offset]),
      Math.abs(first.data[offset + 1] - second.data[offset + 1]),
      Math.abs(first.data[offset + 2] - second.data[offset + 2]),
    )
    if (delta >= 12) changed += 1
  }
  return changed / Math.max(1, samples)
}

test('opening establishes a full-screen theme-specific kinetic score without runtime errors', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=full`)
  await waitUntilReady(page)

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    activeBeat: 0,
    activeName: '压低',
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
  })
  expect(state.frames).toBeGreaterThan(0)
  const canvas = page.locator('.trail-canvas')
  await expect(canvas).toBeVisible()
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.width).toBeGreaterThan(1_300)
  expect(bounds!.height).toBeGreaterThan(800)
  await expect(page.getByRole('heading', { name: '动作 记谱台' })).toBeVisible()
  await expect(page.locator('.truth-label')).toContainText('动作编排视觉模拟')

  await page.screenshot({
    path: resolve(evidenceDir, '01-desktop-opening.jpg'),
    type: 'jpeg',
    quality: 82,
  })
  await page.screenshot({
    path: verifiedCoverPath,
    type: 'jpeg',
    quality: 88,
  })
  expect(runtimeErrors).toEqual([])
})

test('wheel, pointer, controls, keyboard and save causally change the same score', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=reduce`)
  await waitUntilReady(page)

  const canvas = page.locator('.trail-canvas')
  const before = await canvas.screenshot({ animations: 'disabled' })

  await page.mouse.wheel(0, 150)
  await page.waitForFunction(() => window.__kineticScore?.snapshot().activeBeat === 1)
  await expect(page.locator('[data-active-name]')).toHaveText('转身')
  const wheeled = await snapshot(page)
  expect(wheeled.wheelProgress).toBeGreaterThan(0)

  await page.mouse.move(1_330, 210)
  await page.waitForFunction(() => (window.__kineticScore?.snapshot().direction ?? 0) > 40)
  const pointed = await snapshot(page)
  expect(pointed.pointer.x).toBeGreaterThan(.6)
  await expect(page.locator('[data-direction]')).toHaveText(/\+\d+°/)

  await page.locator('#energy').fill('88')
  await page.locator('#duration').fill('21')
  await expect(page.locator('[data-energy-output]')).toHaveText('88%')
  await expect(page.locator('[data-duration-output]')).toHaveText('2.1拍')
  expect(await snapshot(page)).toMatchObject({ energy: 88, duration: 21 })

  await page.locator('[data-beat="1"]').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-active-name]')).toHaveText('悬停')
  expect((await snapshot(page)).activeBeat).toBe(2)

  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText('已保存模拟短句')
  expect((await snapshot(page)).saved).toBe(true)

  const after = await canvas.screenshot({ animations: 'disabled' })
  expect(await sampledPixelDifference(before, after)).toBeGreaterThan(.01)
  await page.screenshot({
    path: resolve(evidenceDir, '02-desktop-edited.jpg'),
    type: 'jpeg',
    quality: 82,
  })
  expect(runtimeErrors).toEqual([])
})

test('390px reduced-motion state preserves the stage, controls and primary action', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?quality=low`)
  await waitUntilReady(page)

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
  })
  const dock = page.locator('#score-controls')
  await expect(dock).toBeVisible()
  const bounds = await dock.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
  await expect(page.locator('[data-save]')).toBeVisible()
  await page.locator('[data-beat="3"]').click()
  await expect(page.locator('[data-active-name]')).toHaveText('抵达')

  await page.screenshot({
    path: resolve(evidenceDir, '03-mobile-reduced-motion.jpg'),
    type: 'jpeg',
    quality: 82,
  })
  expect(runtimeErrors).toEqual([])
})

test('forced Canvas fallback keeps the bright score, editing and save path operable', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&fallback=1`)
  await waitUntilReady(page)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    fallback: true,
    frames: 0,
    horizontalOverflow: false,
  })
  await expect(page.locator('.trail-canvas')).toBeHidden()
  await expect(page.locator('.fallback-score')).toBeVisible()
  await expect(page.locator('[data-fallback-message]')).toContainText('基础记谱模式')
  await page.locator('#energy').fill('67')
  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText('转身 72%')
  await expect(page.locator('[data-save-status]')).toContainText('压低 67%')

  await page.screenshot({
    path: resolve(evidenceDir, '04-canvas-fallback.jpg'),
    type: 'jpeg',
    quality: 82,
  })
  expect(runtimeErrors).toEqual([])
})
