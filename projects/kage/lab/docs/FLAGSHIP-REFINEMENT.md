# Flagship refinement record

Updated: 2026-08-24, Asia/Shanghai

## Design contract

- Entry mode: revision-led implementation.
- Request revision: replace the procedural `composed-world` main demo with the strongest available model-assisted result.
- Target user and context: a creator describes an idea and expects an excellent Three.js web presentation, not a recolored template.
- Desired first impression: a restrained, premium audio-product scene with an immediately credible visual anchor.
- Visual ambition: Immersive.
- Experience architecture: Editorial Flow with a persistent WebGL stage.
- Visual anchor: ChatGPT built-in image generation produced the smart-audio product image and an edit-derived aligned depth map; exact prompts and provenance are recorded in `docs/assets/chatgpt-resonance-v1.md`.
- State-to-scene mapping: scroll changes camera, depth displacement, assembly, energy, density and fog; pointer adds bounded parallax.
- Mobile transformation: the same semantic chapter flow, a portrait camera crop, low-cost geometry and a compact bottom navigation.
- Fallback: readable DOM plus the real hero asset as a static plate when WebGL is unavailable.
- Visual constraints: near-black studio, icy cyan, restrained amber, no generic orb, no decorative template grid, one easing family.
- Information constraints: DOM owns all meaningful copy and navigation; WebGL never owns required information.
- Operation constraints: scroll is primary, pointer is optional enhancement, quality/reduced-motion controls remain reachable.
- State constraints: asset loading is observable; low quality disables bloom; reduced motion renders a deterministic stable frame.
- Environment constraints: canonical command `npm.cmd run dev -- --host 127.0.0.1 --port 8143`; canonical URL `http://127.0.0.1:8143/`.
- Primary journey: open flagship → understand intent → scroll through shape/direct/release → retain readable fallback.
- User-defined phases: use best model capability; integrate prior research and suitable GitHub techniques; keep architecture and code quality; verify the result as the main demo.
- Required artifacts: flagship manifest, model asset pair, scene plugin, quality-aware postprocessing, desktop/mobile/fallback browser evidence, automated checks.
- Autonomy authorization: repeated explicit “继续” and direct instruction to implement against the stated goal.
- User-decision boundary: new providers, paid external services, product scope beyond the current web experience.
- Observable completion criteria: default route uses the flagship; assets load without browser errors; scroll/pointer/controls work; desktop and 390px layouts do not clip; reduced motion is stable; semantic fallback remains complete; build and test suites pass.

## Coverage manifest

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Best result | Asset-led first impression | 1440×900, high, first view | `flagship-desktop-hero.png`; asset state `ready`; Bloom active | 2 | pass | None |
| Three.js direction | Scroll and pointer spatial response | Desktop, balanced, shape node | `flagship-desktop-depth-state.png`; shape active; controls and focus visible | 5 | pass | None |
| Architecture | Quality and reduced-motion mapping | 390×844, low, reduced | `flagship-mobile-low.png`; Bloom off; limited parallax; stable frame count | 7 | pass | None |
| Fallback | Readable non-WebGL path | 390×844, renderer none | Four chapters/nav items; hero asset confirmed in computed background | 8 | pass | None |
| Engineering | No regressions | Build, unit, browser | Build pass; 45/45 unit; 30/30 browser after the runtime-evidence/revision increment | 9 | pass | None |

## Browser refinement ledger

- Canonical runtime: `npm.cmd run dev -- --host 127.0.0.1 --port 8143`.
- Canonical route: `http://127.0.0.1:8143/`.
- Browser: local Google Chrome through Playwright, WebGL enabled.
- Desktop evidence: 1440×900, dark-only flagship theme, high and balanced quality, 2026-08-24.
- Mobile evidence: 390×844, low quality, reduced motion, 2026-08-24.
- Foreground evidence: scroll to `shape`, pointer movement, controls open, keyboard focus visible.
- Capability evidence: model color/depth pair reaches `assetState=ready`; high/balanced uses Bloom; low disables Bloom; `renderer=none` remains readable.

Two browser-observed defects were fixed during calibration:

1. Reduced-motion rendered before asynchronous textures arrived. Root cause: the plugin contract had no invalidation signal. The contract now provides `invalidate()`, and the asset plugin requests one render after success or failure.
2. Mobile navigation appeared inside the top bar because an ancestor `backdrop-filter` changed the fixed-position containing block. The mobile flagship top bar no longer creates that containing block, and the browser test asserts the navigation is at the viewport bottom.
3. The semantic fallback used a CSS-hardcoded hero URL, allowing WebGL and non-WebGL modes to diverge after an asset revision. `renderExperience` now derives `--fallback-hero-image` from the active Manifest's `hero-color` asset.

The full browser suite initially timed out under ten concurrent GPU-heavy workers. This was reproducible resource contention rather than product failure: the same cases passed individually. WebGL browser tests run with one worker; after the runtime-evidence/revision increment the full suite passes 30/30.

## Supported boundaries

- Theme: the flagship intentionally supports one dark cinematic theme; no light-theme claim is made.
- Locale: the page is authored for `zh-CN` with compact English technical labels; no RTL or translated locale claim is made.
- Input: scroll and keyboard navigation are required; pointer parallax is optional and disabled under reduced motion or non-hover input.
- Rendering: WebGL is an enhancement. The semantic DOM and the model-generated hero plate remain available without it.

## Implementation boundary

The generated color/depth pair is currently `L3-presentable`: suitable for the main web demonstration, but not claimed as a true 3D product model or an `L4` close-up asset. The scene plugin consumes declared assets and exposes loading/quality metrics; it does not fabricate missing assets or silently substitute the procedural demo.
