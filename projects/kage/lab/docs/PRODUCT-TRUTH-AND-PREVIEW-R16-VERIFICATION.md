# R16 verification — preview integrity and live-model truth

Date: 2026-08-25

## Browser defect and result

Before repair, the workbench shell was tall but its iframe retained the browser default 150 px height. The unused shell area appeared as a large black void. Automatic `scrollIntoView` also aligned the result heading beneath the 68 px sticky header.

After repair on the generated fashion brief:

- sticky header bottom: 68 px;
- generated heading top: 88.3 px;
- iframe height: 494 px;
- iframe inner viewport: 494 px;
- WebGL canvas height: 494 px;
- nested experience controls: `display: none`;
- desktop horizontal overflow: 0 px.

At 390 × 844:

- iframe height: 446.75 px;
- provenance trace width: 359 px;
- runnable samples: 2;
- horizontal overflow: 0 px.

## Generation truth

The inspected fashion run reported:

- actual provider: `codex:gpt-5.4`;
- requested provider: `auto`;
- EffectSpec source: `model`;
- selected registered runtime: `signal-world`;
- generated media assets: unavailable for this run because image and texture generation capabilities were missing;
- cache: `hit` for the repeated visual check.

The UI now exposes these as four separate values instead of collapsing them into a single “Codex generated” claim.

## Independent live-model acceptance

Command:

```powershell
npx.cmd playwright test --config=playwright.live.config.ts
```

Result: 1 / 1 passed in 2.4 minutes using a new, previously unused brief. The test requires:

- provider id beginning with `codex:`;
- at least two returned candidates;
- every returned candidate using a model-sourced EffectSpec;
- selected generated preview loaded in the real iframe;
- visible model/runtime provenance trace.

This test is intentionally separate from the deterministic browser suite. Normal regression tests remain repeatable and do not silently spend time or model capacity.

## Evidence

Final desktop capture:

`C:\Users\yun68\.codex\visualizations\2026\08\23\01a0304e-ca17-7101-be56-637db8b892b0\kage-r16\desktop-model-result.png`
