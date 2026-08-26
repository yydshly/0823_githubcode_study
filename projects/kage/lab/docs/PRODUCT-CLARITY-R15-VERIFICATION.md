# R15 verification

Date: 2026-08-25

## Browser evidence

- Auto mode before explicit generation:
  - `data-product-awaiting=true`
  - `data-product-state=idle`
  - preview iframe `src=about:blank`
  - result detail hidden
  - two runnable sample links visible
  - no Vite overlay and no horizontal overflow
- Mobile 390 × 844:
  - both sample links visible
  - first sample width 359 px
  - horizontal overflow 0 px
- Explicit real generation:
  - provider `codex:gpt-5.4`
  - requested provider `auto`
  - model `gpt-5.4`
  - cache status `hit`
  - two model EffectSpec candidates returned
  - selected candidate `generated-1h5wsw3-blueprint-elp55a-frozen-signal-atlas-blueprint`
  - UI source label `MODEL GENERATED · GPT-5.4`

Screenshots:

- `before.png`: old bootstrap draft presented as a result.
- `after-waiting.png`: truthful waiting state with two samples.
- `after-generated.png`: explicit Codex result.

The files are stored in `C:\Users\yun68\.codex\visualizations\2026\08\23\01a0304e-ca17-7101-be56-637db8b892b0\kage-r15`.

## Automated checks

- TypeScript + production build: passed.
- Unit tests: 54 / 54 passed across 20 files.
- Playwright: 44 / 44 passed.
- Targeted R15 checks cover waiting state, explicit generation, desktop samples, mobile samples, semantic fallback, and model-asset production after explicit generation.

## Remaining engineering note

Vite reports the existing experience bundle at about 650.52 kB minified / 170.13 kB gzip. This is not a functional failure, but route-level code splitting remains a useful later optimization.
