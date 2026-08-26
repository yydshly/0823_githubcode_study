# Creative capability showcase — R11

Updated: 2026-08-25, Asia/Shanghai

## Design contract

- Entry mode: revision-led implementation.
- Request revision: R11 — return the visible product to idea → creative webpage; move evaluation and engineering artifacts behind an advanced disclosure.
- Target user and context: a creator wants to describe an intended feeling or subject and immediately understand what kinds of complete Three.js webpages the system can construct.
- Desired first impression: a live creative stage with materially different worlds, not a technical control panel or a grid of abstract geometry demos.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace. The brief and direction choices are semantic DOM; one persistent live preview is the visual stage; engineering evidence is secondary detail.
- Visual anchor: one large same-origin live preview. Three proof directions differ in subject, composition, spatial metaphor, motion language and asset strategy.
- Visual constraints: no generic orb as the showcase anchor; no equal-weight debug panels; one direction may be procedural, but the showcase may not be only primitives.
- Information constraints: the primary flow names the idea, visual strategy and visible consequence. Provider, schema and evidence details remain available under an advanced disclosure.
- Operation constraints: type a brief → generate directions → select a direction → inspect a real page → open the complete experience. Curated proof directions remain directly selectable without a provider.
- State constraints: preview loading, active direction, generation, selection and provider unavailability remain legible.
- Environment constraints: same-origin Vite runtime at port 8143; dark theme only; no external model API required for the curated proof.
- Primary journey: open workbench → inspect three creative worlds → enter or adjust a brief → generate/select → see the real selected page → open it full-screen.
- User-defined phases: demonstrate creative and more varied effects in the webpage; do not make evaluation the product.
- Required artifacts: one new asset-led creative world, live preview stage, advanced technical disclosure, desktop/mobile/fallback browser evidence, build and regression results.
- Autonomy authorization: explicit “确定” and instruction to return to the project and demonstrate capabilities.
- User-decision boundary: paid provider calls, publishing, and new product categories outside the current web experience.
- Observable completion criteria: the stage exposes three visibly distinct complete experiences; the new world uses generated project assets and Three.js motion; selecting a proof or generated candidate updates the real preview; technical controls no longer dominate; 1440×900 and 390×844 remain operable; semantic fallback and reduced motion remain intact.

## Selected WebGL route

- Selected pattern: product-case creative showcase combining a cinematic product page, an asset-led narrative environment and a procedural shader editorial page.
- Evidence branch: same-origin runtime snapshots, retained desktop/mobile screenshots, generated asset provenance and browser interactions.
- Required inputs: existing resonance color/depth pair, new tidal-archive color/depth pair, registered runtime and semantic DOM shell.
- Expected output: one user-facing stage that proves breadth through complete pages, while preserving the existing generation contracts behind it.
- Skill update: none until browser evidence shows the pattern reusable beyond this project.

## Coverage record

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Creative proof | Three materially different worlds | desktop stage | live resonance / tidal archive / chromatic iframe assertions | 2/5 | pass | none |
| Idea-driven flow | Brief remains the primary input | desktop/mobile | generated candidate selection updates the same real preview stage | 3/5 | pass | none |
| Product focus | Technical evidence becomes secondary | desktop/mobile | `#advanced-analysis` closed by default; original controls remain reachable | 3/4 | pass | none |
| New effect | Asset-led tidal archive is complete | full preview, WebGL | generated pair + `tidal-archive` snapshot: assets ready, depth full, plates/threads present | 2/5 | pass | none |
| Fallback | New world remains readable without WebGL | 390×844, renderer none | four semantic chapters, navigation and Manifest-derived hero plate | 8 | pass | none |
| Cross-surface | Stage remains usable | 1440×900 and 390×844 | `phase11-creative-stage-*.png`; no horizontal overflow | 7 | pass | none |
| Engineering | Existing system has no regression | build/unit/browser | build pass; 47/47 unit; 33/33 browser | 9 | pass | keep in regression |
