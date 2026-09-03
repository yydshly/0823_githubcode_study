import path from 'node:path';
import { expect, test } from '@playwright/test';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';
import { V2_EXPERIENCE_ARCHIVE } from '../src/v2/experience-archive.ts';

declare global {
  interface Window {
    __copied?: string;
    __kageV2?: {
      authorPackage: () => {
        packageId: string;
        contractId: string;
        authoringInput: {
          contractId: string;
          exactBrief: string;
          mediumDecision: {
            preferred: string;
          };
          visualAmbition: {
            intentLevel: string;
            hero: { title: string; withinSeconds: number };
          };
        };
        runSeed: {
          id: string;
          contractId: string;
          creativeProtocolVersion: 5;
          productDeliveryPlan: { journey: Array<{ phase: string }> };
        };
        timing: {
          deadlineAfterMs: number;
          silentRetries: number;
        };
        evidenceRequirements: {
          wowGateRequired: boolean;
          productDeliveryRequired: boolean;
          identityBinding: string;
        };
      };
      serializedPackage: () => string;
      snapshot: () => {
        contractId: string;
        pattern: string;
        strategy: string;
        capabilityId: string | null;
        capabilitySelected: boolean;
        semanticCapabilityId: string | null;
        semanticInteractionSelected: boolean;
        identityCapabilityId: string | null;
        identityEvidenceSelected: boolean;
        audioFeedbackCapabilityId: string | null;
        audioFeedbackSelected: boolean;
        packageId: string;
        directRunId: string;
        visualAmbitionLevel: string;
        heroTitle: string;
        authoringBytes: number;
        deadlineAfterMs: number;
        wowGateRequired: boolean;
        baselineVersion: '2.5';
        v25ArchivedDeliveryCount: number;
        creativeProtocolVersion: 5;
        mediumDecision: string;
        v3ArchivedDeliveryCount: number;
        v3ArchivedDeliveryIds: string[];
        v3MediumRoutes: string[];
        stale: boolean;
      };
    };
  }
}

test('V5 composer delivers one product-complete selection-guarded package and invalidates it on input drift', async ({ page }) => {
  let apiRequests = 0;
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') apiRequests += 1;
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          window.__copied = text;
        }
      }
    });
  });

  await page.goto('/pages/v2/?revision=r138-composer-e2e');
  await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true'
    && document.documentElement.dataset.v25ArchiveReady === 'true'
    && document.documentElement.dataset.v3ArchiveReady === 'true'
    && document.documentElement.dataset.experienceArchiveReady === 'true');
  await expect(page.locator('html')).toHaveAttribute('data-v3-archive-ready', 'true');

  const initial = await page.evaluate(() => ({
    snapshot: window.__kageV2?.snapshot(),
    authorPackage: window.__kageV2?.authorPackage(),
    serialized: window.__kageV2?.serializedPackage()
  }));

  expect(initial.snapshot).toEqual(expect.objectContaining({
    packageId: expect.stringMatching(/^author-package-/),
    directRunId: expect.stringMatching(/^direct-/),
    visualAmbitionLevel: expect.stringMatching(/^(restrained|expressive|immersive|flagship)$/),
    heroTitle: expect.any(String),
    authoringBytes: expect.any(Number),
    deadlineAfterMs: expect.any(Number),
    wowGateRequired: expect.any(Boolean),
    baselineVersion: '2.5',
    v25ArchivedDeliveryCount: 6,
    creativeProtocolVersion: 5,
    mediumDecision: expect.any(String),
    v3ArchivedDeliveryCount: V3_VERIFIED_DELIVERIES.length,
    v3ArchivedDeliveryIds: V3_VERIFIED_DELIVERIES.map((delivery) => delivery.deliveryId),
    v3MediumRoutes: V3_VERIFIED_DELIVERIES.map((delivery) => delivery.mediumRoute),
    stale: false
  }));
  expect(initial.snapshot?.heroTitle.length).toBeGreaterThan(1);
  expect(initial.snapshot?.authoringBytes).toBeGreaterThan(0);
  expect(initial.snapshot?.authoringBytes).toBeLessThan(30 * 1024);
  expect(initial.snapshot?.deadlineAfterMs).toBeGreaterThanOrEqual(60_000);
  expect(initial.snapshot?.mediumDecision).toBe(initial.authorPackage?.authoringInput.mediumDecision.preferred);

  await expect(page.locator('#direct-package')).toBeVisible();
  await expect(page.locator('#direct-package')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#direct-package')).toHaveAttribute('data-protocol-version', '5');
  await expect(page.locator('#direct-package')).toContainText(/PROTOCOL\s*V5/i);
  await expect(page.locator('#direct-package-id')).toContainText(initial.snapshot?.packageId ?? 'missing-package');
  await expect(page.locator('#direct-package-id')).toContainText(initial.snapshot?.directRunId ?? 'missing-run');
  await expect(page.locator('#direct-ambition')).not.toBeEmpty();
  await expect(page.locator('#direct-hero')).toContainText(initial.snapshot?.heroTitle ?? 'missing-hero');
  await expect(page.locator('#direct-medium')).toHaveAttribute(
    'data-medium-route',
    initial.authorPackage?.authoringInput.mediumDecision.preferred ?? 'missing-medium'
  );
  await expect(page.locator('#direct-medium')).toContainText(
    new RegExp(initial.authorPackage?.authoringInput.mediumDecision.preferred ?? 'missing-medium', 'i')
  );
  await expect(page.locator('#direct-budget')).toContainText('素材批次');
  await expect(page.locator('#direct-deadline')).toContainText('0 静默重试');

  expect(initial.authorPackage).toEqual(expect.objectContaining({
    packageId: initial.snapshot?.packageId,
    contractId: initial.snapshot?.contractId,
    authoringInput: expect.objectContaining({ contractId: initial.snapshot?.contractId }),
    runSeed: expect.objectContaining({
      id: initial.snapshot?.directRunId,
      contractId: initial.snapshot?.contractId,
      creativeProtocolVersion: 5,
      productDeliveryPlan: expect.objectContaining({
        journey: expect.arrayContaining([
          expect.objectContaining({ phase: 'entry' }),
          expect.objectContaining({ phase: 'continuation' })
        ])
      })
    }),
    timing: expect.objectContaining({
      deadlineAfterMs: initial.snapshot?.deadlineAfterMs,
      silentRetries: 0
    }),
    evidenceRequirements: expect.objectContaining({
      wowGateRequired: initial.snapshot?.wowGateRequired,
      productDeliveryRequired: true,
      identityBinding: 'runId+bundleHash'
    })
  }));

  const marker = 'DIRECT_CREATIVE_AUTHOR_PACKAGE_JSON\n';
  expect(initial.serialized).toContain(marker);
  expect(new TextEncoder().encode(initial.serialized).length).toBe(initial.snapshot?.authoringBytes);
  expect(new TextEncoder().encode(initial.serialized).length).toBeLessThan(30 * 1024);
  const serializedJson = initial.serialized?.split(marker)[1];
  expect(serializedJson).toBeTruthy();
  expect(JSON.parse(serializedJson ?? '{}')).toEqual(initial.authorPackage);

  const requestsBeforeCopy = apiRequests;
  await page.locator('#build-button').click();
  await expect(page.locator('#build-button')).toHaveAttribute('data-state', 'copied');
  await expect(page.locator('#build-button')).toContainText('有界包已复制');
  await expect(page.locator('#copy-button')).toHaveAttribute('data-state', 'copied');
  await expect(page.locator('#copy-button')).toContainText('已复制有界包');
  expect(await page.evaluate(() => window.__copied)).toBe(initial.serialized);
  expect(apiRequests).toBe(requestsBeforeCopy);

  const changedBrief = '为夜间植物园设计一个会随访客脚步逐渐显露花粉路径的明亮互动网页，最终引导预约夜游。';
  await page.locator('#brief-input').fill(changedBrief);
  expect(await page.evaluate(() => window.__kageV2?.snapshot().stale)).toBe(true);
  await expect(page.locator('#copy-button')).toBeDisabled();
  await expect(page.locator('#direct-package')).toHaveAttribute('data-state', 'stale');
  await expect(page.locator('#build-button')).toBeDisabled();
  await expect(page.locator('#build-button')).not.toHaveAttribute('href', /.+/);

  await page.locator('#plan-button').click();
  const regenerated = await page.evaluate(() => ({
    snapshot: window.__kageV2?.snapshot(),
    authorPackage: window.__kageV2?.authorPackage()
  }));
  expect(regenerated.snapshot).toEqual(expect.objectContaining({ stale: false }));
  expect(regenerated.snapshot?.contractId).not.toBe(initial.snapshot?.contractId);
  expect(regenerated.snapshot?.packageId).not.toBe(initial.snapshot?.packageId);
  expect(regenerated.snapshot?.directRunId).not.toBe(initial.snapshot?.directRunId);
  expect(regenerated.authorPackage?.contractId).toBe(regenerated.snapshot?.contractId);
  expect(regenerated.authorPackage?.authoringInput.contractId).toBe(regenerated.snapshot?.contractId);
  expect(regenerated.authorPackage?.runSeed.contractId).toBe(regenerated.snapshot?.contractId);
  expect(regenerated.authorPackage?.runSeed.creativeProtocolVersion).toBe(5);
  expect(regenerated.snapshot?.creativeProtocolVersion).toBe(5);
  expect(regenerated.snapshot?.mediumDecision).toBe(regenerated.authorPackage?.authoringInput.mediumDecision.preferred);
  expect(regenerated.authorPackage?.authoringInput.exactBrief).toBe(changedBrief);
  await expect(page.locator('#copy-button')).toBeEnabled();
  await expect(page.locator('#build-button')).toBeEnabled();
  await expect(page.locator('#build-button')).toHaveAttribute('data-contract-id', regenerated.snapshot?.contractId ?? 'missing-contract');
});

test('V5 direct package remains reachable without horizontal overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pages/v2/?revision=r138-composer-mobile-e2e');
  await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true'
    && document.documentElement.dataset.v25ArchiveReady === 'true'
    && document.documentElement.dataset.v3ArchiveReady === 'true');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await page.locator('#direct-package').scrollIntoViewIfNeeded();
  await expect(page.locator('#direct-package')).toBeVisible();
  await expect(page.locator('#direct-package .direct-package-grid > div')).toHaveCount(5);
  await expect(page.locator('#direct-product-journey')).toContainText('ENTRY → USE → RESULT → CONTINUATION');
  await page.locator('#copy-button').scrollIntoViewIfNeeded();
  await expect(page.locator('#copy-button')).toBeVisible();
  await expect(page.locator('#copy-button')).toBeEnabled();
  await page.locator('#copy-button').focus();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('copy-button');

  const bounds = await page.locator('#copy-button').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

test('V2 composer exposes a verified capability and rejects a mismatched GLB route', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/');
  await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true'
    && document.documentElement.dataset.v25ArchiveReady === 'true'
    && document.documentElement.dataset.v3ArchiveReady === 'true');

  const initial = await page.evaluate(() => window.__kageV2?.snapshot());
  expect(initial).toMatchObject({
    pattern: 'environmental-memory',
    strategy: 'media-scroll-scrub',
    capabilityId: 'media-scroll-scrub',
    capabilitySelected: true,
    semanticCapabilityId: null,
    semanticInteractionSelected: false,
    identityCapabilityId: null,
    identityEvidenceSelected: false
  });
  await expect(page.locator('#capability-strip')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#capability-name')).toHaveText('连续媒体滚动叙事');
  await expect(page.locator('#capability-demo')).toHaveAttribute('href', './prototypes/scroll-scrub-media/');
  const verifiedExamples = page.locator('[data-example-id]');
  expect(await verifiedExamples.count()).toBeGreaterThanOrEqual(30);
  await expect(page.locator('[data-example-id="dream-record"]')).toHaveAttribute('href', './deliveries/dream-record/');
  await expect(page.locator('[data-example-id="paper-restoration"]')).toHaveAttribute('href', '../../cases/dedicated-7c944e0c386f/');
  await expect(page.locator('[data-example-id="scroll-scrub-media"]')).toHaveAttribute('href', './prototypes/scroll-scrub-media/');
  await expect(page.locator('[data-example-id="semantic-interaction"]')).toHaveAttribute('href', './prototypes/semantic-interaction/?demo=1');
  await expect(page.locator('[data-example-id="identity-evidence"]')).toHaveAttribute('href', './prototypes/identity-evidence/');
  await expect(page.locator('[data-example-id="soundboard-audio-feedback"]')).toHaveAttribute('href', '../../cases/dedicated-b4d381a24320/');
  await expect(page.locator('[data-example-id="sign-language-season"]')).toHaveAttribute('href', './deliveries/sign-language-season/');
  await expect(page.locator('[data-example-id="thin-film-lab"]')).toHaveAttribute('href', './deliveries/thin-film-lab/');
  await expect(page.locator('[data-example-id="kinetic-score"]')).toHaveAttribute('href', './deliveries/kinetic-score/');
  await expect(page.locator('[data-example-id="wind-kite-lab"]')).toHaveAttribute('href', './deliveries/wind-kite-lab/');
  await expect(page.locator('[data-example-id="after-rain-archive"]')).toHaveAttribute('href', './deliveries/after-rain-archive/');
  await expect(page.locator('[data-example-id="paper-butterfly-garden"]')).toHaveAttribute('href', './deliveries/paper-butterfly-garden/');
  await expect(page.locator('[data-example-id="roof-water-route"]')).toHaveAttribute('href', './deliveries/roof-water-route/');
  await expect(page.locator('[data-example-id="night-reflective-catalog"]')).toHaveAttribute('href', './deliveries/night-reflective-catalog/');
  await expect(page.locator('[data-example-id="color-relay-branching"]')).toHaveAttribute('href', './deliveries/color-relay-branching/');
  await expect(page.locator('[data-v25-archive-id="ice-core-letters"]')).toHaveAttribute('data-run-id', 'direct-r125-ice-core-letters');
  await expect(page.locator('[data-v25-archive-id="ice-core-letters"]')).toHaveAttribute('data-bundle-hash', 'de2fe28ea88ca9d6c238947c634ccbe92f11793422c31f448c2c310d0a94f031');
  await expect(page.locator('[data-v25-archive-id="roof-water-route"]')).toHaveAttribute('data-run-id', 'direct-r127-roof-water-route');
  await expect(page.locator('[data-v25-archive-id="roof-water-route"]')).toHaveAttribute('data-bundle-hash', 'c41783ee2c07301fd996e92dd300618c9c019a93f74c358c8a0f36c8cb6effce');
  await expect(page.locator('[data-v25-archive-id="night-reflective-catalog"]')).toHaveAttribute('data-run-id', 'direct-r128-night-reflective-catalog');
  await expect(page.locator('[data-v25-archive-id="night-reflective-catalog"]')).toHaveAttribute('data-bundle-hash', 'ef0ae71482af63a997095d6398b03f806833a418593d1ac46b8d0e709faca379');
  await expect(page.locator('[data-v25-archive-id="color-relay-branching"]')).toHaveAttribute('data-run-id', 'direct-r129-color-relay-branching');
  await expect(page.locator('[data-v25-archive-id="color-relay-branching"]')).toHaveAttribute('data-bundle-hash', '1ccc53197308a7f6411a1157774b65980284dab773c50c8189f7210195c7e2cc');
  await expect(page.locator('[data-v25-archive-id="forest-sound-route"]')).toHaveAttribute('data-run-id', 'direct-r131-forest-sound-route');
  await expect(page.locator('[data-v25-archive-id="forest-sound-route"]')).toHaveAttribute('data-bundle-hash', '2a8112069032c41fa4ecdc12fc90e981fa0adf14be73e9a53ca1dd22cb4b0906');
  await expect(page.locator('[data-v25-archive-id="moonlit-tidepool-panorama"]')).toHaveAttribute('data-run-id', 'direct-r132-moonlit-tidepool-panorama');
  await expect(page.locator('[data-v25-archive-id="moonlit-tidepool-panorama"]')).toHaveAttribute('data-bundle-hash', 'afd279d0604da135c9b764feb3f987ee086f67525685a56f040bf9e293a43026');
  const v3Cards = page.locator('[data-v3-archive-id]');
  await expect(v3Cards).toHaveCount(V3_VERIFIED_DELIVERIES.length);
  for (const delivery of V3_VERIFIED_DELIVERIES) {
    const card = page.locator(`[data-v3-archive-id="${delivery.deliveryId}"]`);
    await expect(card).toHaveCount(1);
    const resolvedCardRoute = new URL((await card.getAttribute('href')) ?? '', page.url()).pathname;
    const resolvedRegisteredRoute = new URL(delivery.route, page.url()).pathname;
    expect(resolvedCardRoute).toBe(resolvedRegisteredRoute);
    await expect(card).toHaveAttribute('data-run-id', delivery.runId);
    await expect(card).toHaveAttribute('data-bundle-hash', delivery.bundleHash);
    await expect(card).toHaveAttribute('data-medium-route', delivery.mediumRoute);
  }
  await page.locator('#verified-examples').scrollIntoViewIfNeeded();
  const curatedCards = page.locator('.verified-example-card:not([hidden])');
  const curatedImages = curatedCards.locator('img');
  await expect(curatedCards).toHaveCount(V2_EXPERIENCE_ARCHIVE.length);
  await expect(page.locator('html')).toHaveAttribute('data-experience-archive-count', String(V2_EXPERIENCE_ARCHIVE.length));
  await expect(page.locator('[data-experience-archive-id="sonic-pressing-room"]')).toBeVisible();
  await curatedImages.evaluateAll((images) => {
    images.forEach((image) => {
      if (image instanceof HTMLImageElement) image.loading = 'eager';
    });
  });
  await page.locator('[data-example-id="stormglass-archive"] img').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('.verified-example-card:not([hidden]) img'))
    .every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 12_000 });
  expect(await curatedImages.evaluateAll((images) =>
    images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)
  )).toBe(true);
  for (const entry of V2_EXPERIENCE_ARCHIVE) {
    await expect(page.locator(`[data-experience-archive-id="${entry.id}"]`)).toHaveAttribute('href', entry.route);
    expect((await page.request.get(entry.route)).status()).toBe(200);
  }
  for (const route of [
    '/pages/v2/deliveries/dream-record/',
    '/cases/dedicated-7c944e0c386f/',
    '/pages/v2/prototypes/scroll-scrub-media/',
    '/pages/v2/prototypes/semantic-interaction/?demo=1',
    '/pages/v2/prototypes/identity-evidence/',
    '/cases/dedicated-b4d381a24320/',
    '/pages/v2/deliveries/sign-language-season/',
    '/pages/v2/deliveries/thin-film-lab/',
    '/pages/v2/deliveries/kinetic-score/',
    '/pages/v2/deliveries/wind-kite-lab/',
    '/pages/v2/deliveries/after-rain-archive/',
    '/pages/v2/deliveries/paper-butterfly-garden/',
    '/pages/v2/deliveries/weave-light-field/',
    '/pages/v2/deliveries/ice-core-letters/',
    '/pages/v2/deliveries/roof-water-route/',
    '/pages/v2/deliveries/night-reflective-catalog/',
    '/pages/v2/deliveries/color-relay-branching/',
    '/pages/v2/deliveries/forest-sound-route/',
    '/pages/v2/deliveries/moonlit-tidepool-panorama/',
    '/pages/v2/deliveries/stormglass-archive/',
    '/pages/v2/deliveries/prism-seed-theatre/',
    '/pages/v2/deliveries/film-camera-repair-paths/',
    '/pages/v2/deliveries/west-bund-meeting-points/',
    '/pages/v2/deliveries/fox-gait-observatory/',
    '/pages/v2/deliveries/ten-second-callsign-decode/',
    '/pages/v2/deliveries/folded-light-studio/'
  ]) {
    expect((await page.request.get(route)).status()).toBe(200);
  }
  await expect(page.locator('#style-fingerprint > div')).toHaveCount(6);
  await expect(page.locator('#project-status')).toBeVisible();
  await expect(page.locator('#project-status li')).toHaveCount(5);
  await expect(page.locator('#project-status')).toContainText('一个方向 / 一批素材 / 一次构建 / 有限修复');
  await expect(page.locator('#project-status')).toContainText('R160');
  await expect(page.locator('#project-status')).toContainText('产品交付门');
  await expect(page.locator('#project-status')).toContainText('正式素材或运行时原生媒介依据');
  await expect(page.locator('#style-difference')).toContainText('候选方向');
  await expect(page.locator('#style-avoid')).toContainText('工作台可选');
  await expect(page.locator('#style-avoid')).toContainText('不强制改变风格轴');
  await expect(page.locator('#reference-list article')).toHaveCount(1);
  await expect(page.locator('#reference-list article a')).toHaveAttribute('href', '../../cases/dedicated-8574ee46ab16/');
  await expect(page.locator('#build-structure')).toContainText('连续叙事场');
  await expect(page.locator('#direct-budget')).toContainText('1 构建');
  await expect(page.locator('#build-button')).toHaveAttribute('type', 'button');
  await expect(page.locator('#build-button')).not.toHaveAttribute('href', /.+/);
  await expect(page.locator('#build-button')).toHaveAttribute('data-contract-id', initial?.contractId ?? 'missing-contract');
  const plannedDirections = page.locator('[data-direction-id]');
  await expect(plannedDirections).toHaveCount(6);
  await expect(page.locator('[data-direction-id="daylight-civic-atlas"]')).toHaveAttribute('data-status', 'next-validation');
  await expect(page.locator('[data-direction-id="daylight-civic-atlas"] .creative-direction-use')).toHaveAttribute('type', 'button');
  await expect(page.locator('[data-direction-id="daylight-civic-atlas"] .creative-direction-use')).toContainText('生成 V3 契约');
  await expect(page.locator('[data-direction-id="daylight-civic-atlas"] .creative-direction-result')).toHaveAttribute('href', /generated-runs\/dedicated-c0514ddead80/);
  await expect(page.locator('[data-direction-id="precision-machine-anatomy"]')).toHaveAttribute('data-status', 'asset-required');
  await page.screenshot({
    path: path.resolve(import.meta.dirname, '../docs/screenshots/v2-composer-desktop.png'),
    fullPage: true,
    animations: 'disabled'
  });

  await page.locator('#brief-input').fill(
    '为社区剧场设计一张演出季网页，让访客理解本周节目并完成购票。'
  );
  await page.locator('#plan-button').click();
  await expect(page.locator('#reference-list .empty-state')).toContainText('不强行套用案例');

  await page.locator('#brief-input').fill(
    '为海洋记忆数字展陈设计网页，需要档案证据、空间关系和可以选择的探索路径，比较不同年代的海岸变化。'
  );
  await page.locator('#plan-button').click();
  await expect(page.locator('#semantic-capability')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#semantic-capability-name')).toContainText('已启用');
  await expect(page.locator('#semantic-outputs')).toContainText('证据数值');
  await expect(page.locator('#semantic-capability a')).toHaveAttribute('href', './prototypes/semantic-interaction/');
  expect(await page.evaluate(() => window.__kageV2?.snapshot())).toMatchObject({
    semanticCapabilityId: 'semantic-responsive-interaction',
    semanticInteractionSelected: true
  });

  await page.locator('#brief-input').fill(
    '为生物材料品牌建立网页身份，展示材料来源、研究过程、证明证据与最终成果。'
  );
  await page.locator('#plan-button').click();
  await expect(page.locator('#identity-capability')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#identity-capability-name')).toContainText('已启用');
  expect(await page.evaluate(() => window.__kageV2?.snapshot())).toMatchObject({
    identityCapabilityId: 'identity-through-evidence',
    identityEvidenceSelected: true
  });

  await page.locator('#brief-input').fill(
    '为制琴师设计云杉音板调音台，调整厚度时同步更新频率、共振与敲击听感，并提供 A/B 声音对比。'
  );
  await page.locator('#plan-button').click();
  await expect(page.locator('#audio-feedback-capability')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#audio-feedback-route')).toContainText('SYNTHESIZED WEB AUDIO');
  expect(await page.evaluate(() => window.__kageV2?.snapshot())).toMatchObject({
    audioFeedbackCapabilityId: 'product-semantic-audio-feedback',
    audioFeedbackSelected: true
  });

  await page.locator('#brief-input').fill('为声学设备设计产品网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。');
  await page.locator('#plan-button').click();
  await expect(page.locator('#capability-strip')).toHaveAttribute('data-selected', 'false');
  await expect(page.locator('#capability-name')).toHaveText('本目标不启用连续媒体滚动');
  const custom = await page.evaluate(() => window.__kageV2?.snapshot());
  expect(custom).toMatchObject({
    strategy: 'model-spatial',
    capabilitySelected: false,
    semanticInteractionSelected: false
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true'
    && document.documentElement.dataset.v25ArchiveReady === 'true'
    && document.documentElement.dataset.v3ArchiveReady === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await expect(page.locator('#build-button')).toBeVisible();
  await page.screenshot({
    path: path.resolve(import.meta.dirname, '../docs/screenshots/v2-composer-mobile.png'),
    fullPage: true,
    animations: 'disabled'
  });

  expect(errors).toEqual([]);
});

test('workbench stops a drifted V2 launch before creating an expensive job', async ({ page }) => {
  let jobCreates = 0;
  await page.route('**/api/creative/jobs', (route) => {
    if (route.request().method() === 'POST') jobCreates += 1;
    return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '不应创建任务' }) });
  });

  await page.goto('/workbench.html?provider=codex&quality=high&autorun=1&contract=contract-different&brief=%E4%B8%BA%E6%A2%A6%E5%A2%83%E8%AE%B0%E5%BD%95%E8%AE%BE%E8%AE%A1%E8%BF%9E%E7%BB%AD%E7%A9%BA%E9%97%B4%E7%BD%91%E9%A1%B5%E3%80%82');
  await expect(page.locator('#v2-contract-state')).toContainText('合同不一致');
  await expect(page.locator('#workbench-error')).toContainText('已停止自动生成');
  await expect(page.locator('#generate')).toBeDisabled();
  expect(jobCreates).toBe(0);
});
