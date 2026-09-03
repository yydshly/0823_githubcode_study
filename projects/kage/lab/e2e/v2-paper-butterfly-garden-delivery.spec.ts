import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

type ButterflyId = 'mulberry' | 'glassine' | 'recycled' | 'gold' | 'indigo' | 'vellum'

type PaperButterflySnapshot = {
  ready: boolean
  phase: 'opening' | 'exploring' | 'selected' | 'joined'
  selectedId: ButterflyId | null
  joined: boolean
  pointer: { x: number; y: number; active: boolean }
  formationAmount: number
  openingProgress: number
  objectCount: number
  frames: number
  drawCalls: number
  triangles: number
  fallback: boolean
  reducedMotion: boolean
  environmentLoaded: boolean
  horizontalOverflow: boolean
  quality: 'high' | 'balanced' | 'low'
  visualRevision: string
}

declare global {
  interface Window {
    __paperButterflyGarden?: {
      snapshot: () => PaperButterflySnapshot
      select: (id: ButterflyId) => void
      join: () => void
      setPointer: (x: number, y: number) => void
    }
  }
}

const route = '/pages/v2/deliveries/paper-butterfly-garden/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'r120-paper-butterfly-garden')

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
    document.querySelector<HTMLElement>('#app')?.dataset.paperButterflyReady === 'true'
    && window.__paperButterflyGarden?.snapshot().ready === true
  ))
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__paperButterflyGarden!.snapshot())
}

test('opening settles into one full-bleed daylight field containing six rendered paper butterflies', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${route}?quality=high&motion=full&revision=r120-proof`)
  await waitUntilReady(page)
  await page.waitForFunction(() => {
    const state = window.__paperButterflyGarden?.snapshot()
    return state?.phase === 'exploring' && state.openingProgress >= .99
  })

  const state = await snapshot(page)
  expect(state).toMatchObject({
    ready: true,
    phase: 'exploring',
    selectedId: null,
    joined: false,
    objectCount: 6,
    fallback: false,
    reducedMotion: false,
    environmentLoaded: true,
    horizontalOverflow: false,
    quality: 'high',
    visualRevision: 'r120-proof',
  })
  expect(state.frames).toBeGreaterThan(0)
  expect(state.drawCalls).toBeGreaterThan(0)
  expect(state.triangles).toBeGreaterThan(0)
  await expect(page.locator('.environment-plate')).toBeVisible()
  await expect(page.locator('.butterfly-canvas')).toBeVisible()
  await expect(page.locator('[data-butterfly-id]')).toHaveCount(6)
  await expect(page.getByRole('heading', { name: /纸蝶.*日光游园/ })).toBeVisible()
  await expect(page.locator('.concept-note')).toContainText(/概念演示/)
  await page.screenshot({
    path: resolve(evidenceDir, '01-desktop-opening.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})

test('real pointer input visibly reforms the shared object field before any object is selected', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=full&revision=r120-proof`)
  await waitUntilReady(page)

  const initial = await snapshot(page)
  await page.mouse.move(180, 220)
  await page.mouse.move(1_180, 520, { steps: 10 })
  await page.waitForFunction((before) => {
    const state = window.__paperButterflyGarden?.snapshot()
    return Boolean(
      state?.pointer.active
      && Math.abs(state.pointer.x - before.pointer.x) > .2
      && state.formationAmount > Math.max(.45, before.formationAmount + .18)
    )
  }, initial)

  const formed = await snapshot(page)
  expect(formed.phase).toBe('exploring')
  expect(formed.selectedId).toBeNull()
  expect(formed.pointer.active).toBe(true)
  expect(formed.formationAmount).toBeGreaterThan(.45)
  await page.screenshot({
    path: resolve(evidenceDir, '02-desktop-formation.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})

test('selecting one butterfly updates its nearby story and the final action joins the same object', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.goto(`${route}?quality=high&motion=reduced&revision=r120-proof`)
  await waitUntilReady(page)

  const marker = page.locator('[data-butterfly-id="indigo"]')
  await marker.click()
  await page.waitForFunction(() => window.__paperButterflyGarden?.snapshot().phase === 'selected')
  expect(await snapshot(page)).toMatchObject({
    selectedId: 'indigo',
    joined: false,
    phase: 'selected',
  })
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-sheet-title]')).toContainText('靛蓝宣纸蝶')
  await expect(page.locator('[data-sheet-material]')).toContainText('靛蓝')

  const action = page.locator('[data-join]')
  await expect(action).toBeEnabled()
  await action.click()
  await page.waitForFunction(() => window.__paperButterflyGarden?.snapshot().phase === 'joined')
  expect(await snapshot(page)).toMatchObject({
    selectedId: 'indigo',
    joined: true,
    phase: 'joined',
  })
  await expect(page.locator('[data-sheet-state]')).toContainText(/已加入|重新编队/)
  await page.screenshot({
    path: resolve(evidenceDir, '03-desktop-selected-joined.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})

test('390px reduced-motion fallback retains all six semantic choices and the complete join journey', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?quality=low&fallback=1&revision=r120-proof`)
  await waitUntilReady(page)

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    objectCount: 6,
    fallback: true,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'low',
    frames: 0,
    drawCalls: 0,
    triangles: 0,
  })
  await expect(page.locator('.butterfly-canvas')).toBeHidden()
  await expect(page.locator('.fallback-garden')).toBeVisible()
  await expect(page.locator('.fallback-butterfly')).toHaveCount(6)
  await expect(page.locator('[data-fallback-message]')).toContainText(/基础纸蝶游园/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)

  const marker = page.locator('[data-butterfly-id="mulberry"]')
  await marker.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__paperButterflyGarden?.snapshot().selectedId === 'mulberry')
  await expect(page.locator('[data-sheet-title]')).toContainText('桑皮纸蝶')
  await expect(page.locator('[data-join]')).toBeEnabled()
  await page.locator('[data-join]').click()
  await page.waitForFunction(() => window.__paperButterflyGarden?.snapshot().joined === true)

  await page.screenshot({
    path: resolve(evidenceDir, '04-mobile-reduced-fallback.jpg'),
    type: 'jpeg',
    quality: 86,
  })
  expect(runtimeErrors).toEqual([])
})
