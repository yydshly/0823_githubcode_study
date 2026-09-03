import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const route = '/pages/v2/deliveries/dream-record/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'v2-dream-record')

async function waitUntilReady(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => document.documentElement.dataset.dreamReady === 'true')
}

async function setProgress(page: import('@playwright/test').Page, progress: number) {
  await page.evaluate((value) => {
    ;(window as any).__dreamRecordDelivery.setProgress(value)
  }, progress)
  await page.waitForTimeout(100)
}

async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as any).__dreamRecordDelivery.snapshot())
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true })
})

test('desktop journey reaches a saved, keyboard-safe ending', async ({ page }) => {
  await page.goto(route)
  await page.evaluate(() => localStorage.removeItem('kage-dream-record-v2'))
  await page.reload()
  await waitUntilReady(page)

  await expect(page.locator('h1')).toContainText('醒来以后')
  let state = await snapshot(page)
  expect(state.activeScene).toBe('awakening')
  expect(state.assetsLoaded).toEqual([true, true, true])
  expect(state.hasHorizontalOverflow).toBe(false)
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.jpg'), type: 'jpeg', quality: 76 })

  await setProgress(page, 0.5)
  state = await snapshot(page)
  expect(state.activeScene).toBe('fragments')
  await expect(page.locator('[data-beat="1"]')).toContainText('走回昨夜')
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-fragments.jpg'), type: 'jpeg', quality: 76 })

  await setProgress(page, 1)
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-record-ending.jpg'), type: 'jpeg', quality: 76 })
  await page.locator('[data-open-record]').click()
  await expect(page.locator('.record-dialog')).toHaveJSProperty('open', true)
  await expect(page.locator('#dream-draft')).toBeFocused()
  await page.locator('#dream-draft').fill('雨停以后，房间里只剩下一盏很低的灯。')
  await page.locator('.save-button').click()
  await expect(page.locator('[data-save-status]')).toContainText('已保存在这台设备')
  state = await snapshot(page)
  expect(state.saved).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('.record-dialog')).not.toHaveJSProperty('open', true)
  expect(await page.locator('[data-open-record]').evaluate((element) => document.activeElement === element)).toBe(true)
})

test('mobile ending stays full-bleed and uses a usable record sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(route)
  await waitUntilReady(page)
  await setProgress(page, 1)

  let state = await snapshot(page)
  expect(state.activeScene).toBe('record')
  expect(state.hasHorizontalOverflow).toBe(false)
  await page.locator('[data-open-record]').click()
  await expect(page.locator('#dream-draft')).toBeFocused()
  state = await snapshot(page)
  expect(state.dialogOpen).toBe(true)
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-record-sheet.jpg'), type: 'jpeg', quality: 76 })
})

test('reduced motion and missing-assets fallback preserve the full journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route)
  await waitUntilReady(page)
  await setProgress(page, 0.5)
  let state = await snapshot(page)
  expect(state.reducedMotion).toBe(true)
  expect(state.activeScene).toBe('fragments')

  await page.goto(`${route}?fallback=1`)
  await waitUntilReady(page)
  await setProgress(page, 1)
  state = await snapshot(page)
  expect(state.fallback).toBe(true)
  expect(state.activeScene).toBe('record')
  expect(state.hasHorizontalOverflow).toBe(false)
  await page.locator('[data-open-record]').click()
  await expect(page.locator('.record-dialog')).toHaveJSProperty('open', true)
})
