import { expect, test } from '@playwright/test';

test('loads the generated SDK as an ES module from an opaque sandbox origin', async ({ page }) => {
  await page.setContent(`
    <iframe sandbox="allow-scripts" srcdoc="
      <script type='module'>
        import { defineExperience } from 'http://127.0.0.1:8143/src/generated-sdk/index.ts';
        document.body.dataset.moduleLoaded = typeof defineExperience;
      <\/script>
    "></iframe>`);
  const frame = page.frames()[1];
  await frame.waitForFunction(() => document.body.dataset.moduleLoaded === 'function');
  expect(await frame.locator('body').getAttribute('data-module-loaded')).toBe('function');
});

test('limits sandbox module CORS to Origin null and approved local module paths', async ({ request }) => {
  const approved = await request.get('/src/generated-sdk/index.ts', { headers: { Origin: 'null' } });
  expect(approved.headers()['access-control-allow-origin']).toBe('null');

  const foreignOrigin = await request.get('/src/generated-sdk/index.ts', { headers: { Origin: 'https://example.test' } });
  expect(foreignOrigin.headers()['access-control-allow-origin']).toBeUndefined();

  const unapprovedPath = await request.get('/src/workbench.ts', { headers: { Origin: 'null' } });
  expect(unapprovedPath.headers()['access-control-allow-origin']).toBeUndefined();
});
