import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

type ThinFilmSnapshot = {
  ready: boolean
  heroProgress: number
  heroState: 'forming' | 'blooming' | 'settled'
  thickness: number
  tension: number
  pointerAngle: number
  lightAngle: number
  wheelProgress: number
  frames: number
  drawCalls: number
  triangles: number
  fallback: boolean
  reducedMotion: boolean
  horizontalOverflow: boolean
  quality: 'low' | 'balanced' | 'high'
}

declare global {
  interface Window {
    __thinFilmLab?: {
      snapshot: () => ThinFilmSnapshot
      setThickness: (value: number) => void
      setTension: (value: number) => void
    }
  }
}

const route = '/pages/v2/deliveries/thin-film-lab/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'r114-thin-film-lab')

test.describe.configure({ timeout: 45_000 })

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
    document.documentElement.dataset.thinFilmReady === 'true'
    && window.__thinFilmLab?.snapshot().ready === true
  ))
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__thinFilmLab!.snapshot())
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
    const red = Math.abs(first.data[offset] - second.data[offset])
    const green = Math.abs(first.data[offset + 1] - second.data[offset + 1])
    const blue = Math.abs(first.data[offset + 2] - second.data[offset + 2])
    if (Math.max(red, green, blue) >= 12) changed += 1
  }
  return changed / Math.max(1, samples)
}

test('desktop WebGL hero visibly forms and settles within its five-second contract', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=full`)
  await waitUntilReady(page)

  const canvas = page.locator('.film-canvas')
  await expect(canvas).toBeVisible()
  const canvasBounds = await canvas.boundingBox()
  expect(canvasBounds).not.toBeNull()
  expect(canvasBounds!.width).toBeGreaterThan(1_000)
  expect(canvasBounds!.height).toBeGreaterThan(700)

  const opening = await snapshot(page)
  expect(opening).toMatchObject({
    ready: true,
    fallback: false,
    reducedMotion: false,
    quality: 'high',
    horizontalOverflow: false,
  })
  expect(opening.heroProgress).toBeLessThan(1)
  expect(opening.frames).toBeGreaterThan(0)

  await page.waitForFunction(() => {
    const state = window.__thinFilmLab?.snapshot()
    return state?.heroState === 'settled' && state.heroProgress >= .999
  }, undefined, { timeout: 6_500 })

  const complete = await snapshot(page)
  expect(complete.heroState).toBe('settled')
  expect(complete.heroProgress).toBe(1)
  expect(complete.frames).toBeGreaterThan(opening.frames + 20)
  expect(complete.drawCalls).toBeGreaterThan(0)
  expect(complete.drawCalls).toBeLessThanOrEqual(8)
  expect(complete.triangles).toBeGreaterThan(1_000)
  expect(complete.triangles).toBeLessThan(50_000)
  await expect(page.locator('[data-hero-state]')).toHaveText('模拟光谱已稳定')

  await page.screenshot({
    path: resolve(evidenceDir, '01-desktop-hero-complete.jpg'),
    type: 'jpeg',
    quality: 80,
  })
  expect(runtimeErrors).toEqual([])
})

test('pointer, wheel, both controls and keyboard produce causal scene and semantic changes', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=reduce`)
  await waitUntilReady(page)

  const initial = await snapshot(page)
  const visualBefore = await page.locator('.film-canvas').screenshot({ animations: 'disabled' })
  const initialSpectrumShift = await page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--spectral-shift')
  ))
  const initialFilmScale = await page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--film-scale')
  ))

  await page.mouse.move(1_300, 210)
  await page.waitForFunction(() => Math.abs(window.__thinFilmLab?.snapshot().pointerAngle ?? 0) > 12)
  const pointed = await snapshot(page)
  expect(pointed.pointerAngle).toBeGreaterThan(12)
  expect(pointed.lightAngle).not.toBe(initial.lightAngle)
  await expect(page.locator('[data-angle-readout]')).toHaveText(/^\+\d{2}$/)

  await page.mouse.wheel(0, 120)
  await page.waitForFunction((before) => {
    const state = window.__thinFilmLab?.snapshot()
    return state !== undefined && state.thickness > before.thickness && state.tension > before.tension
  }, pointed)
  const wheeled = await snapshot(page)
  expect(wheeled.wheelProgress).toBeGreaterThan(pointed.wheelProgress)
  expect(wheeled.thickness).toBeGreaterThan(pointed.thickness)
  expect(wheeled.tension).toBeGreaterThan(pointed.tension)
  await expect(page.locator('[data-thickness-readout]')).toHaveText(String(Math.round(wheeled.thickness)).padStart(2, '0'))
  await expect(page.locator('[data-tension-readout]')).toHaveText(String(Math.round(wheeled.tension)).padStart(2, '0'))

  const thickness = page.locator('#thickness')
  await thickness.fill('89')
  await expect(page.locator('[data-thickness-output]')).toHaveText('89')
  expect((await snapshot(page)).thickness).toBe(89)
  const changedSpectrumShift = await page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--spectral-shift')
  ))
  expect(changedSpectrumShift).not.toBe(initialSpectrumShift)

  const tension = page.locator('#tension')
  await tension.fill('33')
  await expect(page.locator('[data-tension-output]')).toHaveText('33%')
  expect((await snapshot(page)).tension).toBe(33)
  const changedFilmScale = await page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--film-scale')
  ))
  expect(changedFilmScale).not.toBe(initialFilmScale)

  await thickness.focus()
  await expect(thickness).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(thickness).toHaveValue('90')
  expect((await snapshot(page)).thickness).toBe(90)

  await page.locator('.experience-shell').click({ position: { x: 650, y: 420 }, force: true })
  await page.keyboard.press('ArrowLeft')
  expect((await snapshot(page)).thickness).toBe(88)

  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText('膜厚刻度 88、张力 33%')
  await expect(page.locator('[data-save-status]')).toContainText('不是实验测量记录')

  const visualAfter = await page.locator('.film-canvas').screenshot({ animations: 'disabled' })
  expect(await sampledPixelDifference(visualBefore, visualAfter)).toBeGreaterThan(.01)

  await page.screenshot({
    path: resolve(evidenceDir, '02-desktop-interaction.jpg'),
    type: 'jpeg',
    quality: 80,
  })
  expect(runtimeErrors).toEqual([])
})

test('390px reduced-motion mode reaches the complete state without losing controls', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?quality=low`)
  await waitUntilReady(page)

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    heroProgress: 1,
    heroState: 'settled',
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'low',
  })
  expect(state.drawCalls).toBeGreaterThan(0)
  expect(state.drawCalls).toBeLessThanOrEqual(8)
  expect(state.triangles).toBeGreaterThan(0)
  expect(state.triangles).toBeLessThan(50_000)

  const panel = page.locator('#controls')
  const panelBounds = await panel.boundingBox()
  expect(panelBounds).not.toBeNull()
  expect(panelBounds!.x).toBeGreaterThanOrEqual(0)
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(391)
  expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(845)
  await expect(page.locator('#thickness')).toBeVisible()
  await expect(page.locator('#tension')).toBeVisible()
  await expect(page.locator('[data-save]')).toBeVisible()

  await page.screenshot({
    path: resolve(evidenceDir, '03-mobile-reduced-motion.jpg'),
    type: 'jpeg',
    quality: 80,
  })
  expect(runtimeErrors).toEqual([])
})

test('forced fallback preserves the light-lab theme, content, controls and primary action', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&fallback=1`)
  await waitUntilReady(page)

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    heroProgress: 1,
    heroState: 'settled',
    fallback: true,
    horizontalOverflow: false,
    quality: 'high',
  })
  expect(state.drawCalls).toBe(0)
  expect(state.triangles).toBe(0)
  await expect(page.locator('.film-canvas')).toBeHidden()
  await expect(page.locator('.fallback-stage')).toBeVisible()
  await expect(page.locator('.runtime-fallback')).toBeVisible()
  await expect(page.locator('.runtime-fallback')).toContainText('参数、说明与保存操作仍然可用')
  await expect(page.getByRole('heading', { name: /薄膜/ })).toBeVisible()
  await expect(page.locator('.simulation-flag')).toContainText('视觉模拟 · 非实验测量')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#eee9df')
  expect(await page.locator('.experience-shell').evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')

  await page.locator('#thickness').fill('47')
  await page.locator('#tension').fill('81')
  await expect(page.locator('[data-thickness-readout]')).toHaveText('47')
  await expect(page.locator('[data-tension-readout]')).toHaveText('81')
  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText('膜厚刻度 47、张力 81%')

  await page.screenshot({
    path: resolve(evidenceDir, '04-webgl-fallback.jpg'),
    type: 'jpeg',
    quality: 80,
  })
  expect(runtimeErrors).toEqual([])
})
