import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const route = '/pages/v2/deliveries/sign-language-season/'
const evidenceDir = resolve(process.cwd(), '.artifacts', 'v2-sign-language-season')

async function waitUntilReady(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => document.documentElement.dataset.signLanguageSeasonReady === 'true')
}

async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as any).__signLanguageSeasonDelivery.snapshot())
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true })
})

test('selection synchronizes notation, access information and demo ticket action', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.goto(route)
  await waitUntilReady(page)

  await expect(page.locator('[data-performance-title]')).toHaveText('沿着风的边缘')
  const initialGesturePath = await page.locator('[data-gesture-path]').getAttribute('d')
  const initialStagePath = await page.locator('[data-stage-path]').getAttribute('d')
  await page.locator('#performance-tab-0').focus()
  await page.keyboard.press('ArrowDown')

  let state = await snapshot(page)
  expect(state.activeIndex).toBe(1)
  expect(state.activeTitle).toBe('停顿练习')
  expect(state.panelLabelledBy).toBe('performance-tab-1')
  expect(state.selectedTabs).toBe(1)
  expect(state.accessibilityItems).toBe(3)
  expect(state.hasHorizontalOverflow).toBe(false)
  await expect(page.locator('[data-month]')).toHaveText('OCT')
  await expect(page.locator('[data-day]')).toHaveText('03')
  await expect(page.locator('[data-caption]')).toContainText('下一句话会从肩膀开始')
  await expect(page.locator('[data-stage-label]')).toHaveText('折返 / 停驻')
  await expect(page.locator('[data-ticket-price]')).toHaveText('¥120 · 演示')
  await expect(page.locator('[data-gesture-path]')).not.toHaveAttribute('d', initialGesturePath || '')
  await expect(page.locator('[data-stage-path]')).not.toHaveAttribute('d', initialStagePath || '')

  await page.locator('[data-ticket-button]').click()
  await expect(page.locator('[data-ticket-status]')).toContainText('不会创建订单或产生费用')
  state = await snapshot(page)
  expect(state.ticketStatus).toContain('停顿练习')
  expect(runtimeErrors).toEqual([])

  await page.screenshot({ path: resolve(evidenceDir, 'desktop-selection.jpg'), type: 'jpeg', quality: 80, fullPage: true })
})

test('390px and reduced motion preserve the complete selectable canvas', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route)
  await waitUntilReady(page)
  await page.locator('#performance-tab-2').click()

  const state = await snapshot(page)
  expect(state.activeIndex).toBe(2)
  expect(state.reducedMotion).toBe(true)
  expect(state.hasHorizontalOverflow).toBe(false)
  expect(state.selectedTabs).toBe(1)
  await expect(page.locator('[data-performance-title]')).toHaveText('向光说话')
  await expect(page.locator('.demo-label')).toContainText('非真实售票')
  await expect(page.locator('.site-footer')).toContainText('产品能力演示')
  expect(runtimeErrors).toEqual([])

  await page.screenshot({ path: resolve(evidenceDir, 'mobile-390.jpg'), type: 'jpeg', quality: 80, fullPage: true })
})
