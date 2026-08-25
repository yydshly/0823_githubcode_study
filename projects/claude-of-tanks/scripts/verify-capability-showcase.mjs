import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const upstreamPackage = resolve(projectRoot, 'upstream/package.json');
const requireFromUpstream = createRequire(upstreamPackage);
const puppeteer = requireFromUpstream('puppeteer');

const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4173';
const outDir = resolve(projectRoot, 'evidence/capability-showcase');
mkdirSync(outDir, { recursive: true });

const report = {
  url: `${baseUrl}/studio?showcase=capabilities`,
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--use-gl=angle', '--enable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) report.consoleErrors.push(message.text());
});
page.on('pageerror', (error) => report.consoleErrors.push(String(error)));

try {
  await page.goto(report.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(
    () => window.__COT_CAPABILITY_SHOWCASE?.status === 'ready',
    { timeout: 300000, polling: 1000 },
  );

  report.audit = await page.evaluate(() => {
    window.__COT_CAPABILITY_SHOWCASE.pause();
    return {
      ...window.__COT_CAPABILITY_SHOWCASE.audit(),
      effectTypes: window.__STUDIO.listEffects().map((effect) => effect.type),
      actorDetails: window.__STUDIO.listActors().map(({ name, id, state }) => ({ name, id, state })),
      loadTrace: window.__STUDIO_LOAD,
      warmTrace: window.__STUDIO_WARM,
    };
  });

  const frames = [
    { timeMs: 0, name: '01-establishing.png' },
    { timeMs: 9000, name: '02-impact-language.png' },
    { timeMs: 19500, name: '03-destruction-hero.png' },
  ];
  report.frames = [];
  for (const frame of frames) {
    await page.evaluate((timeMs) => {
      window.__COT_CAPABILITY_SHOWCASE.pause();
      window.__COT_CAPABILITY_SHOWCASE.seek(timeMs);
    }, frame.timeMs);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
    const file = resolve(outDir, frame.name);
    await page.screenshot({ path: file });
    report.frames.push({ ...frame, file });
  }

  const required = new Set(report.audit.effectTypes);
  const assertions = {
    ready: report.audit.status === 'ready',
    map: report.audit.map === 'desert',
    actors: report.audit.actors === 4,
    effectInstances: report.audit.effects === 25,
    allEffectTypes: report.audit.missingEffectTypes.length === 0 && report.audit.effectTypes.length === 25,
    cameraShots: report.audit.storyboard.shots.length === 6,
    actorTracks: report.audit.storyboard.actorTracks.length === 3,
    requiredTypesUnique: required.size === 17,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.assertions = assertions;
  report.result = Object.values(assertions).every(Boolean) ? 'pass' : 'fail';
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  report.diagnostics = await page.evaluate(() => ({
    gameReady: window.__GAME_READY,
    studio: window.__STUDIO ? { active: window.__STUDIO.active, mapId: window.__STUDIO.mapId } : null,
    showcase: window.__COT_CAPABILITY_SHOWCASE ? {
      status: window.__COT_CAPABILITY_SHOWCASE.status,
      error: window.__COT_CAPABILITY_SHOWCASE.error,
    } : null,
    studioLoad: window.__STUDIO_LOAD,
    studioWarm: window.__STUDIO_WARM,
    worldLoad: window.__WORLD_LOAD,
  })).catch(() => null);
  await page.screenshot({ path: resolve(outDir, 'failure.png') }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
