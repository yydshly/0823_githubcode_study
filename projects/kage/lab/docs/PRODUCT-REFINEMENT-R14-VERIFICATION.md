# Product Refinement R14 — Verification

## Delivery status

The scoped R14 product refinement is complete: the workbench now presents one brief, one generation action, one automatically selected live result, and one-line revision. Provider controls, alternate candidates, reference experiences, asset production, evaluation, and engineering artifacts remain available behind explicit disclosure controls.

## Runtime evidence

- Canonical command: `npm.cmd run dev -- --host 127.0.0.1 --port 8143`
- Canonical URL: `http://127.0.0.1:8143/workbench.html`
- Desktop target: 1440×900
- Mobile target: 390×844
- Mobile measured width: viewport 390px; document scroll width 390px.
- Semantic fallback, reduced motion, pointer, scroll, keyboard, and generated iframe routes are covered by the complete Playwright suite.

## Real Codex generation evidence

- Brief: 为夜间工作的独立创作者设计一款智能声音工具发布页：让声波在黑色空间里冻结成半透明玻璃地貌，滚动时从情绪进入能力拆解，最后汇聚为一个明确的开始创作入口。
- Provider: `codex:gpt-5.4`
- Cache: miss; the new interpretation was persisted.
- Model directions: 2.
- Automatically selected result: `玻璃波谷夜曲`.
- Generated candidate: `generated-xkm9g4-blueprint-1wkhhgi-glass-wave-nocturne-blueprint`.
- Embedded runtime reached the ready WebGL state.

## Evidence files

- Baseline desktop: external evidence `kage-r14/baseline-desktop.png`.
- R14 desktop: external evidence `kage-r14/r14-desktop.png`.
- R14 mobile: external evidence `kage-r14/r14-mobile-390.png`.
- Codex generating state: external evidence `kage-r14/r14-codex-generating.png`.
- Codex result: external evidence `kage-r14/r14-codex-result.png`.
- Repository screenshots: `docs/screenshots/phase14-workbench-desktop.png` and `docs/screenshots/phase14-workbench-mobile.png`.

## Engineering validation

- TypeScript: pass.
- Unit tests: 20 files, 54 tests passed.
- Browser tests: 42 tests passed.
- Production build: pass, 152 modules transformed.
- Known warning: the main experience chunk is about 650KB minified / 170KB gzip and should be code-split before production deployment.

## Product boundaries

- The local provider remains a deterministic fast draft, not evidence of model creativity.
- Real brand, product, UI, and information assets still require a trustworthy source.
- Automatic vision-based aesthetic evaluation is not integrated; browser evidence and manual visual review remain the honest fallback.
- `.env.local` selects medium Codex reasoning and a 180-second timeout for interactive use. A final high-effort art-direction run can override this deliberately.

