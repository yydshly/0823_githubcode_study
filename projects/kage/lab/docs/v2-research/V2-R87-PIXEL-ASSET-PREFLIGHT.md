# V2 R87 — Pixel Asset Preflight

## Stage goal

Stop technically invalid image assets before Codex authoring without adding another model call or another visual-review loop.

This stage does **not** judge taste, subject correctness, or final page quality. It only establishes deterministic local facts and never upgrades L2/L3/L4 quality.

## Implemented boundary

- Fully decode PNG/JPEG with a 24 MP input limit.
- Reject empty, truncated, corrupt, unsupported, or undersized images.
- Record oriented width, height, format, SHA-256 and actual decoded Alpha state.
- Classify Alpha as `none`, `binary`, or `soft` from pixels—not from file extension or user/model claims.
- Reject opaque RGBA, JPEG, baked checkerboards, insufficient transparent margin, and tiny subjects for `alpha-subject` composition.
- Apply role-specific dimensions to full-bleed environments, seamless fields, spatial objects and native media.
- Persist inspection facts in asset metadata and pass them through upload, cache, job resume and the Codex asset contract.
- Revalidate cache bytes by content hash; old cache entries are locally decoded and migrated once, while changed/corrupt entries are invalidated.
- Keep MiniMax output at `L2-inspectable`; technical success is not treated as presentable visual quality.

## Concrete finding

The catalog asset `biomaterial-seed-pod-plate-v1` was described for alpha composition but its decoded PNG is fully opaque. R87 now records `alpha=none`, so it cannot silently satisfy an `alpha-subject` contract. Other verified transparent catalog assets record their real Alpha facts.

## Verification

- Focused R87 suite: 5 files / 34 tests passed.
- Full suite: 72 files / 338 tests passed.
- TypeScript: passed.
- Production build: passed (184 modules; existing >500 kB chunk warning remains).
- Dependency audit: 0 vulnerabilities after upgrading Sharp to the patched 0.35 line.
- Running workbench and provider endpoints: HTTP 200.

## Exit condition

R87 is complete when invalid image bytes cannot reach authoring, cache reuse cannot bypass the inspection, and existing non-image asset paths remain unchanged. It intentionally stops here; semantic and aesthetic quality remain the responsibility of the bounded R88 asset-completion contract and R89 end-to-end acceptance run.
