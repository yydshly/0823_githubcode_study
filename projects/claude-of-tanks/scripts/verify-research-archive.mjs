import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');
const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4176';
const outDir = resolve(projectRoot, 'evidence/research-archive');
mkdirSync(outDir, { recursive: true });

for (const filename of ['01-desktop-archive.png', '02-tablet-archive.png', '02-mobile-archive.png', '03-mobile-archive.png', 'failure.png', 'browser-report.json']) {
  const path = resolve(outDir, filename);
  if (existsSync(path)) rmSync(path, { force: true });
}

const report = {
  url: baseUrl + '/research/archive',
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  expensiveRuntimeRequests: [],
  requests: [],
  screenshots: [],
  checks: {},
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  report.consoleErrors.push({ type: 'console', text: message.text(), location: message.location() });
});
page.on('pageerror', (error) => report.consoleErrors.push({ type: 'pageerror', text: String(error) }));
page.on('request', (request) => {
  const url = request.url();
  report.requests.push(url);
  if (/three(?:\.module)?\.js|\/src\/(?:main|game|world|sim)\/|terrain|vegetation|\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|mp4|webm)(?:\?|$)/i.test(url)) {
    report.expensiveRuntimeRequests.push(url);
  }
});

try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__COT_RESEARCH_ARCHIVE?.status === 'ready',
    { timeout: 10_000, polling: 50 },
  );

  report.desktop = await page.evaluate(() => {
    const runtime = window.__COT_RESEARCH_ARCHIVE;
    const routeLinks = [...document.querySelectorAll('[data-archive-demo] [data-archive-route]')];
    const allLinks = [...document.querySelectorAll('a')];
    const sectionLinks = [...document.querySelectorAll('[data-archive-section-link]')];
    const sectionNav = document.querySelector('.archive-section-nav');
    return {
      runtime: {
        version: runtime.version,
        archiveDate: runtime.archiveDate,
        registryVersion: runtime.registryVersion,
        status: runtime.status,
        readyMs: runtime.readyMs,
        routeCount: runtime.routeCount,
        sectionCount: runtime.sectionCount,
        capabilityGroupCount: runtime.capabilityGroupCount,
        evidenceCount: runtime.evidenceCount,
        extensionDirectionCount: runtime.extensionDirectionCount,
        sourceSubjectCount: runtime.sourceSubjectCount,
        sourceBudgetCount: runtime.sourceBudgetCount,
        sourceRiskCount: runtime.sourceRiskCount,
        threeRuntimeLoaded: runtime.threeRuntimeLoaded,
        auditPass: runtime.audit.pass,
      },
      title: document.querySelector('h1')?.textContent.trim(),
      stamp: document.querySelector('.archive-stamp')?.textContent.trim(),
      routeCards: document.querySelectorAll('[data-archive-demo]').length,
      routeLinks: routeLinks.map((link) => ({
        id: link.dataset.archiveRoute,
        href: link.getAttribute('href'),
        origin: new URL(link.href).origin,
      })),
      capabilityRows: document.querySelectorAll('.capability-table tbody tr').length,
      insightCards: document.querySelectorAll('.insight-card').length,
      evidenceCards: document.querySelectorAll('.evidence-card').length,
      extensionCards: document.querySelectorAll('.extension-card').length,
      boundaryPanels: document.querySelectorAll('.boundary-grid .archive-panel').length,
      sectionIds: [...document.querySelectorAll('.archive-section[id]')].map((section) => section.id),
      sectionLinks: sectionLinks.map((link) => ({
        id: link.dataset.archiveSectionLink,
        href: link.getAttribute('href'),
        ariaCurrent: link.getAttribute('aria-current'),
        text: link.textContent.trim(),
      })),
      sectionNav: sectionNav ? {
        position: getComputedStyle(sectionNav).position,
        top: getComputedStyle(sectionNav).top,
        height: sectionNav.getBoundingClientRect().height,
      } : null,
      headings: [...document.querySelectorAll('h1,h2')].map((node) => node.textContent.trim()),
      linkSizes: allLinks.map((link) => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
      bodyTextLength: document.body.innerText.trim().length,
      errorOverlay: Boolean(document.querySelector('.vite-error-overlay, #webpack-dev-server-client-overlay')),
    };
  });
  await page.screenshot({ path: resolve(outDir, '01-desktop-archive.png'), fullPage: true });
  report.screenshots.push('01-desktop-archive.png');

  await page.keyboard.press('Tab');
  report.keyboard = await page.evaluate(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    return {
      tag: active?.tagName,
      href: active?.getAttribute?.('href'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });

  for (let index = 0; index < 5; index += 1) await page.keyboard.press('Tab');
  report.sectionKeyboard = await page.evaluate(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    return {
      sectionId: active?.dataset?.archiveSectionLink,
      href: active?.getAttribute?.('href'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });

  await page.click('[data-archive-section-link="evidence-register"]');
  await page.waitForFunction(() => location.hash === '#evidence-register');
  await page.evaluate(() => new Promise((resolveDelay) => setTimeout(resolveDelay, 650)));
  report.sectionAnchor = await page.evaluate(() => {
    const nav = document.querySelector('.archive-section-nav');
    const current = document.querySelector('[data-archive-section-link][aria-current="location"]');
    const target = document.getElementById('evidence-register');
    return {
      hash: location.hash,
      activeSection: document.getElementById('research-archive')?.dataset.activeSection,
      currentId: current?.dataset.archiveSectionLink,
      currentText: current?.textContent.trim(),
      navPosition: nav ? getComputedStyle(nav).position : null,
      navTop: nav?.getBoundingClientRect().top,
      navBottom: nav?.getBoundingClientRect().bottom,
      targetTop: target?.getBoundingClientRect().top,
    };
  });

  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => window.__COT_RESEARCH_ARCHIVE?.status === 'ready');
  report.tablet = await page.evaluate(() => {
    const nav = document.querySelector('.archive-section-nav');
    return {
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      navPosition: nav ? getComputedStyle(nav).position : null,
      navHeight: nav?.getBoundingClientRect().height,
      linkSizes: [...document.querySelectorAll('[data-archive-section-link]')].map((link) => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    };
  });
  await page.screenshot({ path: resolve(outDir, '02-tablet-archive.png'), fullPage: true });
  report.screenshots.push('02-tablet-archive.png');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => window.__COT_RESEARCH_ARCHIVE?.status === 'ready');
  await page.click('[data-archive-section-link="research-directions"]');
  await page.waitForFunction(() => location.hash === '#research-directions');
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  report.mobile = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const sample = document.querySelector('.archive-action');
    const sectionLinks = document.querySelector('.archive-section-nav-links');
    const nav = document.querySelector('.archive-section-nav');
    const current = document.querySelector('[data-archive-section-link][aria-current="location"]');
    const target = document.getElementById('research-directions');
    return {
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionDuration: sample ? getComputedStyle(sample).transitionDuration : null,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      archiveReady: document.getElementById('research-archive')?.dataset.archiveReady,
      activeSection: document.getElementById('research-archive')?.dataset.activeSection,
      currentId: current?.dataset.archiveSectionLink,
      hash: location.hash,
      navPosition: nav ? getComputedStyle(nav).position : null,
      navTop: nav?.getBoundingClientRect().top,
      navBottom: nav?.getBoundingClientRect().bottom,
      targetTop: target?.getBoundingClientRect().top,
      sectionNavClientWidth: sectionLinks?.clientWidth,
      sectionNavScrollWidth: sectionLinks?.scrollWidth,
      linkSizes: links.map((link) => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    };
  });
  await page.evaluate(() => {
    history.replaceState(null, '', location.pathname);
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  await page.screenshot({ path: resolve(outDir, '03-mobile-archive.png'), fullPage: true });
  report.screenshots.push('03-mobile-archive.png');

  await page.goto(baseUrl + '/research', { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__COT_RESEARCH_PLATFORM?.status === 'ready',
    { timeout: 10_000, polling: 50 },
  );
  report.navigation = await page.evaluate(() => ({
    path: location.pathname,
    platformReady: window.__COT_RESEARCH_PLATFORM?.status,
    archiveLink: document.querySelector('a[href="/research/archive"]')?.getAttribute('href'),
  }));

  const desktop = report.desktop;
  report.checks = {
    route200: response?.status() === 200,
    runtimeReady: desktop.runtime.status === 'ready' && desktop.runtime.auditPass === true,
    archiveIdentity: desktop.runtime.version === 2
      && desktop.runtime.archiveDate === '2026-08-26'
      && desktop.runtime.registryVersion === 3
      && desktop.runtime.sectionCount === 6
      && desktop.stamp.includes('ARCHIVED'),
    meaningfulContent: desktop.title.includes('阶段归档') && desktop.bodyTextLength > 1_500,
    fourOrderedPages: desktop.routeCards === 4
      && desktop.routeLinks.length === 4
      && desktop.routeLinks.every((link) => link.origin === new URL(baseUrl).origin),
    capabilityMapComplete: desktop.runtime.capabilityGroupCount === 7 && desktop.capabilityRows === 7,
    meaningExplained: desktop.insightCards === 3,
    evidenceRegisterComplete: desktop.runtime.evidenceCount === 6 && desktop.evidenceCards === 6,
    archiveBoundaryVisible: desktop.boundaryPanels === 2
      && desktop.headings.includes('本阶段停止扩张')
      && desktop.headings.includes('保留可恢复研究链'),
    sixExtensionDirections: desktop.runtime.extensionDirectionCount === 6 && desktop.extensionCards === 6,
    sourceRegistryAligned: desktop.runtime.sourceSubjectCount === 5
      && desktop.runtime.sourceBudgetCount === 14
      && desktop.runtime.sourceRiskCount === 5,
    lightweightDomOnly: desktop.runtime.threeRuntimeLoaded === false
      && report.expensiveRuntimeRequests.length === 0
      && desktop.errorOverlay === false,
    // Vite development mode includes module transform and websocket setup.
    // The archive remains a DOM-only control surface; keep a transparent
    // development budget instead of comparing it with a production bundle.
    readyBudget: desktop.runtime.readyMs <= 1_500,
    desktopNoHorizontalOverflow: desktop.innerWidth === 1440 && desktop.scrollWidth <= 1440,
    sectionNavigationComplete: desktop.sectionLinks.length === 6
      && desktop.sectionIds.length === 6
      && desktop.sectionLinks.every((link) => link.href === '#' + link.id)
      && desktop.sectionLinks[0].ariaCurrent === 'location',
    desktopSectionNavSticky: desktop.sectionNav?.position === 'sticky'
      && desktop.sectionNav.height >= 44,
    keyboardFocusVisible: report.keyboard.tag === 'A'
      && report.keyboard.outlineStyle === 'solid'
      && Number.parseFloat(report.keyboard.outlineWidth) >= 2,
    sectionKeyboardReachable: report.sectionKeyboard.sectionId === 'viewing-order'
      && report.sectionKeyboard.href === '#viewing-order'
      && report.sectionKeyboard.outlineStyle === 'solid'
      && Number.parseFloat(report.sectionKeyboard.outlineWidth) >= 2,
    desktopHashNavigationWorks: report.sectionAnchor.hash === '#evidence-register'
      && report.sectionAnchor.activeSection === 'evidence-register'
      && report.sectionAnchor.currentId === 'evidence-register'
      && report.sectionAnchor.navPosition === 'sticky'
      && Math.abs(report.sectionAnchor.navTop) <= 2
      && report.sectionAnchor.targetTop >= report.sectionAnchor.navBottom - 2,
    tabletNoHorizontalOverflow: report.tablet.innerWidth === 768
      && report.tablet.scrollWidth <= 768
      && report.tablet.navPosition === 'sticky'
      && report.tablet.linkSizes.length === 6
      && report.tablet.linkSizes.every(({ width, height }) => width >= 44 && height >= 44),
    mobileNoHorizontalOverflow: report.mobile.innerWidth === 390 && report.mobile.scrollWidth <= 390,
    mobileTouchTargets: report.mobile.linkSizes.length >= 8
      && report.mobile.linkSizes.every(({ width, height }) => width >= 44 && height >= 44),
    mobileSectionNavigationWorks: report.mobile.hash === '#research-directions'
      && report.mobile.activeSection === 'research-directions'
      && report.mobile.currentId === 'research-directions'
      && report.mobile.navPosition === 'sticky'
      && Math.abs(report.mobile.navTop) <= 2
      && report.mobile.targetTop >= report.mobile.navBottom - 2
      && report.mobile.sectionNavScrollWidth >= report.mobile.sectionNavClientWidth,
    reducedMotion: report.mobile.reducedMotion === true
      && report.mobile.transitionDuration === '0s'
      && report.mobile.scrollBehavior === 'auto',
    researchNavigationWorks: report.navigation.path === '/research'
      && report.navigation.platformReady === 'ready'
      && report.navigation.archiveLink === '/research/archive',
    evidenceComplete: report.screenshots.length === 3,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.result = Object.values(report.checks).every(Boolean) ? 'pass' : 'fail';
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  await page.screenshot({ path: resolve(outDir, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
