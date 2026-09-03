import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

type WindKiteSnapshot = {
  ready: boolean
  heroProgress: number
  heroState: string
  mode: string
  windSpeed: number
  bridleOffset: number
  altitude: number
  pose: Record<string, number | string | boolean>
  frames: number
  drawCalls: number
  triangles: number
  fallback: boolean
  reducedMotion: boolean
  horizontalOverflow: boolean
  quality: string
  saved: boolean
  visualRevision: string
}

declare global {
  interface Window {
    __windKiteLab?: {
      snapshot: () => WindKiteSnapshot
      setWindSpeed: (value: number) => void
      setBridleOffset: (value: number) => void
      setAltitude: (value: number) => void
    }
  }
}

const route = '/pages/v2/deliveries/wind-kite-lab/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'r118-wind-kite-lab')

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
    document.documentElement.dataset.windKiteReady === 'true'
    && window.__windKiteLab?.snapshot().ready === true
  ))
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__windKiteLab!.snapshot())
}

async function fillRangeAt(locator: Locator, fraction: number) {
  return locator.evaluate((element, nextFraction) => {
    const input = element as HTMLInputElement
    const min = Number(input.min)
    const max = Number(input.max)
    const step = Number(input.step || 1)
    const raw = min + (max - min) * Number(nextFraction)
    const next = Math.round(raw / step) * step
    input.value = String(next)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return Number(input.value)
  }, fraction)
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

test('desktop opening settles into a non-empty daylight 3D kite hero within five seconds', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=full&revision=r118-final`)
  await waitUntilReady(page)

  await page.waitForTimeout(3_500)
  await page.waitForFunction(() => {
    const state = window.__windKiteLab?.snapshot()
    return state?.heroState === 'settled' && state.heroProgress >= .99
  }, undefined, { timeout: 1_500 })

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    heroState: 'settled',
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    quality: 'high',
    saved: false,
    visualRevision: 'r118-final',
  })
  expect(state.heroProgress).toBeGreaterThanOrEqual(.99)
  expect(state.frames).toBeGreaterThan(0)
  expect(state.drawCalls).toBeGreaterThan(0)
  expect(state.triangles).toBeGreaterThan(0)

  const canvas = page.locator('.kite-canvas')
  await expect(canvas).toBeVisible()
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.width).toBeGreaterThan(1_000)
  expect(bounds!.height).toBeGreaterThan(650)
  const opening = await canvas.screenshot({ animations: 'disabled' })
  const stats = await sharp(opening).stats()
  expect(stats.entropy).toBeGreaterThan(1)
  await expect(page.getByRole('heading', { name: /风场校准台/ })).toBeVisible()
  await expect(page.locator('.truth-label')).toContainText(/概念.*模拟/)

  await page.screenshot({
    path: resolve(evidenceDir, '01-desktop-settled.jpg'),
    type: 'jpeg',
    quality: 84,
  })
  expect(runtimeErrors).toEqual([])
})

test('three sliders, wheel and pointer causally change one kite scene and can save it', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=reduce&revision=r118-final`)
  await waitUntilReady(page)

  const canvas = page.locator('.kite-canvas')
  const before = await canvas.screenshot({ animations: 'disabled' })
  const initial = await snapshot(page)
  const initialSemantics = await page.locator('[data-stability], [data-tension]').allTextContents()
  const initialFlightState = await page.locator('[data-flight-state]').textContent()

  const windSpeed = await fillRangeAt(page.locator('#wind-speed'), .82)
  await page.waitForFunction((value) => window.__windKiteLab?.snapshot().windSpeed === value, windSpeed)
  await expect(page.locator('[data-wind-output]')).toContainText(String(windSpeed))

  const bridleOffset = await fillRangeAt(page.locator('#bridle-offset'), .18)
  await page.waitForFunction((value) => window.__windKiteLab?.snapshot().bridleOffset === value, bridleOffset)
  await expect(page.locator('[data-bridle-output]')).not.toBeEmpty()

  const altitude = await fillRangeAt(page.locator('#altitude'), .76)
  await page.waitForFunction((value) => window.__windKiteLab?.snapshot().altitude === value, altitude)
  await expect(page.locator('[data-altitude-output]')).toContainText(String(altitude))

  const afterRanges = await snapshot(page)
  expect(afterRanges).toMatchObject({ windSpeed, bridleOffset, altitude, mode: 'manual', heroState: 'settled' })
  expect(afterRanges.pose).not.toEqual(initial.pose)

  const canvasBounds = await canvas.boundingBox()
  expect(canvasBounds).not.toBeNull()
  await page.mouse.move(canvasBounds!.x + canvasBounds!.width * .5, canvasBounds!.y + canvasBounds!.height * .45)
  const windBeforeWheel = (await snapshot(page)).windSpeed
  await page.mouse.wheel(0, -260)
  await page.waitForFunction((value) => window.__windKiteLab?.snapshot().windSpeed !== value, windBeforeWheel)

  const poseBeforePointer = JSON.stringify((await snapshot(page)).pose)
  await page.mouse.move(canvasBounds!.x + canvasBounds!.width * .12, canvasBounds!.y + canvasBounds!.height * .34)
  await page.waitForTimeout(120)
  await page.mouse.move(canvasBounds!.x + canvasBounds!.width * .88, canvasBounds!.y + canvasBounds!.height * .34)
  await page.waitForFunction((pose) => JSON.stringify(window.__windKiteLab?.snapshot().pose) !== pose, poseBeforePointer)

  const finalSemantics = await page.locator('[data-stability], [data-tension]').allTextContents()
  expect(finalSemantics).not.toEqual(initialSemantics)
  await expect(page.locator('[data-flight-state]')).not.toBeEmpty()
  expect(await page.locator('[data-flight-state]').textContent()).not.toBe(initialFlightState)

  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText(/已保存|方案已保存/)
  expect((await snapshot(page)).saved).toBe(true)

  const after = await canvas.screenshot({ animations: 'disabled' })
  expect(await sampledPixelDifference(before, after)).toBeGreaterThan(.008)
  await page.screenshot({
    path: resolve(evidenceDir, '02-desktop-manual-saved.jpg'),
    type: 'jpeg',
    quality: 84,
  })
  expect(runtimeErrors).toEqual([])
})

test('390px reduced-motion mode has no overflow and keeps controls and CTA reachable', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?quality=low&revision=r118-final`)
  await waitUntilReady(page)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'low',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false)

  const controls = page.locator('#kite-controls')
  await controls.scrollIntoViewIfNeeded()
  await expect(controls).toBeVisible()
  const controlBounds = await controls.boundingBox()
  expect(controlBounds).not.toBeNull()
  expect(controlBounds!.x).toBeGreaterThanOrEqual(0)
  expect(controlBounds!.x + controlBounds!.width).toBeLessThanOrEqual(391)

  for (const control of ['#wind-speed', '#bridle-offset', '#altitude']) {
    await expect(page.locator(control)).toBeVisible()
    await expect(page.locator(control)).toBeEnabled()
  }
  await page.locator('#wind-speed').focus()
  await page.keyboard.press('ArrowRight')
  await page.locator('[data-save]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-save]')).toBeVisible()
  await expect(page.locator('[data-save]')).toBeEnabled()
  await page.locator('[data-save]').click()
  expect((await snapshot(page)).saved).toBe(true)

  await page.screenshot({
    path: resolve(evidenceDir, '03-mobile-reduced-motion.jpg'),
    type: 'jpeg',
    quality: 84,
  })
  expect(runtimeErrors).toEqual([])
})

test('forced fallback preserves the same three controls, semantic result and save action', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&fallback=1&revision=r118-final`)
  await waitUntilReady(page)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    fallback: true,
    frames: 0,
    drawCalls: 0,
    triangles: 0,
    horizontalOverflow: false,
  })
  await expect(page.locator('.kite-canvas')).toBeHidden()
  await expect(page.locator('.fallback-kite')).toBeVisible()
  await expect(page.locator('[data-fallback-message]')).toContainText(/基础|回退|fallback/i)

  const initialSemantics = await page.locator('[data-stability], [data-tension]').allTextContents()
  const windSpeed = await fillRangeAt(page.locator('#wind-speed'), .88)
  const bridleOffset = await fillRangeAt(page.locator('#bridle-offset'), .24)
  const altitude = await fillRangeAt(page.locator('#altitude'), .7)
  await page.waitForFunction(
    ([wind, bridle, height]) => {
      const state = window.__windKiteLab?.snapshot()
      return state?.windSpeed === wind && state.bridleOffset === bridle && state.altitude === height
    },
    [windSpeed, bridleOffset, altitude],
  )
  expect(await page.locator('[data-stability], [data-tension]').allTextContents()).not.toEqual(initialSemantics)
  await page.locator('[data-save]').click()
  await expect(page.locator('[data-save-status]')).toContainText(/已保存|方案已保存/)
  expect((await snapshot(page)).saved).toBe(true)

  await page.screenshot({
    path: resolve(evidenceDir, '04-fallback-saved.jpg'),
    type: 'jpeg',
    quality: 84,
  })
  expect(runtimeErrors).toEqual([])
})
