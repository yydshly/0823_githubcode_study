# Immersive refinement R21

## Design contract

- Entry mode: revision-led refinement of the generated dedicated page.
- Target user and context: a visitor evaluating a fashion launch page on desktop or mobile.
- Desired first impression: an authored material world rather than a generated image placed inside a layout.
- Visual ambition: immersive editorial.
- Experience architecture: editorial flow with one persistent WebGL stage.
- Visual anchor: the garment image is treated as a masked, deformable material source surrounded by procedural threads and depth rings.
- Information order: brand and collection context → singular headline → concise proposition → collection action.
- Operation boundary: one SDK canvas and one SDK-owned progress/pointer timeline; readable DOM remains complete without WebGL.
- Motion intent: establish the subject → release/dissolve its contour → reweave into a calm final composition.
- Fallbacks: low-quality geometry budget, reduced-motion static motion values, and a procedural wireframe subject if the approved image fails.
- Autonomy authorization: the user said to continue and use Figma only if it directly improves the runtime result.

## Observable completion criteria

1. The approved image no longer reads as a hard central rectangle.
2. The page exposes one hero, one structural change, and one resolved final state.
3. Desktop and 390 px mobile have no horizontal overflow or accidental title clipping.
4. The generated route uses one canvas, keeps its CTA reachable, and reports no browser errors.
5. Future dedicated generation explicitly rejects unmotivated rectangular image placement while preserving open creative direction.

## Coverage record

| Requirement | Surface / state | Evidence | Status |
| --- | --- | --- | --- |
| Subject integration | Desktop opening | `E:\0823_codex_project\.tmp\kage-r21-evidence\desktop-opening.png` | pass |
| Structural scroll event | Desktop opening → ending | progress `0.000 → 0.999`, scroll changed | pass |
| Final composition and CTA | Desktop ending | `E:\0823_codex_project\.tmp\kage-r21-evidence\desktop-ending.png` | pass |
| Mobile and reduced motion | 390 × 844, low quality | one canvas, overflow `0`, no runtime errors | pass |
| Semantic DOM fallback | All states | three labelled regions and reachable links in browser snapshot | pass |
| Engineering contract | Project build and dedicated generation tests | build passed; 8 targeted tests passed | pass |
| Future generation quality | Dedicated Codex prompt | asset integration, three-state narrative, hierarchy, and single-canvas rules recorded | pass |

## Validation notes

- Canonical command: `npm run dev -- --host 127.0.0.1 --port 8143`.
- Canonical route: `/generated-runs/dedicated-ba4e9d10caaa/?quality=high&motion=full`.
- Browser validation: desktop 1440 × 900 opening/ending and mobile 390 × 844 reduced-motion.
- Browser result: HTTP 200, ready state true, one canvas, no horizontal overflow, no console or page errors.
- Engineering result: `npm run build` passed with the existing Vite chunk-size warning; targeted Vitest suite passed 8/8.
