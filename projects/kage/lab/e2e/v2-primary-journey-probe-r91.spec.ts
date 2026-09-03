import { expect, test } from '@playwright/test';
import { probePrimaryJourney } from '../server/dedicated-visual-review.ts';

test.describe('R91 primary journey probe', () => {
  test('one real wheel input changes the same visual anchor and result without requiring a fake control', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'wheel' }));
    const state = await probePrimaryJourney(page, 'wheel');

    expect(state).toMatchObject({
      input: 'wheel',
      markers: { anchorCount: 1, controlCount: 0, resultCount: 1, actionCount: 1 },
      inputObserved: true,
      anchorIdentityStable: true,
      anchorChanged: true,
      resultChanged: true,
      actionAvailable: true,
      substitute: 'none'
    });
  });

  test('one real marked range action changes the same visual anchor and result', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'control' }));
    const state = await probePrimaryJourney(page, 'control');

    expect(state).toMatchObject({
      input: 'control',
      markers: { anchorCount: 1, controlCount: 1, resultCount: 1, actionCount: 1 },
      inputObserved: true,
      anchorIdentityStable: true,
      anchorChanged: true,
      resultChanged: true,
      actionAvailable: true,
      substitute: 'none'
    });
  });

  test('does not accept copy-only feedback as a visible subject response', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'wheel', effect: 'copy-only' }));
    const state = await probePrimaryJourney(page, 'wheel');

    expect(state).toMatchObject({
      inputObserved: true,
      anchorChanged: false,
      resultChanged: true,
      substitute: 'copy-or-highlight-only'
    });
  });

  test('identifies opacity-only presentation as a forbidden substitute', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'control', effect: 'opacity-only' }));
    const state = await probePrimaryJourney(page, 'control');

    expect(state.anchorChanged).toBe(true);
    expect(state.substitute).toBe('opacity-or-blur-only');
  });

  test('identifies whole-anchor scaling and framing changes as presentation substitutes', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'control', effect: 'scale-only' }));
    const scaled = await probePrimaryJourney(page, 'control');
    expect(scaled.substitute).toBe('whole-scale-only');

    await page.setContent(primaryJourneyFixture({ input: 'control', effect: 'framing-only' }));
    const reframed = await probePrimaryJourney(page, 'control');
    expect(reframed.substitute).toBe('framing-only');
  });

  test('reports a final action that becomes disabled after the primary input', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'control', effect: 'action-disabled' }));
    const state = await probePrimaryJourney(page, 'control');
    expect(state).toMatchObject({ anchorChanged: true, resultChanged: true, actionAvailable: false });
  });

  test('fails fast when a direct journey has no real marked control', async ({ page }) => {
    await page.setContent(primaryJourneyFixture({ input: 'wheel' }));
    const state = await probePrimaryJourney(page, 'control');

    expect(state).toMatchObject({
      markers: { controlCount: 0 },
      inputObserved: false,
      anchorChanged: null
    });
  });
});

type FixtureEffect = 'subject' | 'copy-only' | 'opacity-only' | 'scale-only' | 'framing-only' | 'action-disabled';

function primaryJourneyFixture({ input, effect = 'subject' }: { input: 'wheel' | 'control'; effect?: FixtureEffect }): string {
  const control = input === 'control'
    ? '<input data-signal-primary-control id="control" type="range" min="0" max="100" value="0" aria-label="变化强度">'
    : '';
  const mutation = effect === 'copy-only'
    ? "result.textContent = 'after'; document.body.dataset.generatedProgress = '.72';"
    : effect === 'opacity-only'
      ? "anchor.style.opacity = '.28'; result.textContent = 'after'; document.body.dataset.generatedProgress = '.72';"
      : effect === 'scale-only'
        ? "anchor.style.transform = 'scale(.68)'; result.textContent = 'after'; document.body.dataset.generatedProgress = '.72';"
        : effect === 'framing-only'
          ? "anchor.style.backgroundPosition = '100% 100%'; result.textContent = 'after'; document.body.dataset.generatedProgress = '.72';"
          : effect === 'action-disabled'
            ? "anchor.style.backgroundImage = 'linear-gradient(135deg,#087f8c 0 42%,#f4d35e 42% 68%,#ee964b 68%)'; result.textContent = 'after'; action.disabled = true; document.body.dataset.generatedProgress = '.72';"
      : "anchor.style.backgroundImage = 'linear-gradient(135deg,#087f8c 0 42%,#f4d35e 42% 68%,#ee964b 68%)'; result.textContent = 'after'; document.body.dataset.generatedProgress = '.72';";
  const listener = input === 'wheel'
    ? `addEventListener('wheel', () => { ${mutation} }, { passive: true });`
    : `control.addEventListener('input', () => { ${mutation} });`;
  return `<!doctype html>
    <style>
      html,body{margin:0;min-height:320vh;background:#f4f0e8;color:#17201d;font-family:Arial,sans-serif}
      [data-signal-visual-anchor]{position:fixed;left:48px;top:84px;width:360px;height:280px;background:linear-gradient(135deg,#243b53 0 45%,#9fb3c8 45% 70%,#d9e2ec 70%);background-size:200% 200%;background-position:0 0;border-radius:24px}
      [data-signal-primary-control]{position:fixed;left:460px;top:120px;width:260px}
      [data-signal-primary-result]{position:fixed;left:460px;top:190px;width:220px;height:48px;background:#fff;padding:12px}
      [data-signal-primary-action]{position:fixed;left:460px;top:280px;width:180px;height:48px}
    </style>
    <div data-signal-visual-anchor id="anchor"></div>
    ${control}
    <output data-signal-primary-result id="result">before</output>
    <button data-signal-primary-action id="action">保存结果</button>
    <script>
      (() => {
      document.body.dataset.generatedProgress = '.42';
      const anchor = document.getElementById('anchor');
      const result = document.getElementById('result');
      const action = document.getElementById('action');
      ${input === 'control' ? "const control = document.getElementById('control');" : ''}
      ${listener}
      })();
    </script>`;
}
