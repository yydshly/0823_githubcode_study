# R116 · KINETIC SCORE delivery contract

- Entry mode: brief-led cross-theme validation.
- Target user: independent dancers shaping a short movement phrase before rehearsal.
- First impression: a bright, full-screen choreography score is visibly alive and editable, not a dark cinematic hero or a three-section template.
- Visual ambition / architecture: Immersive, Spatial Stage; layered Canvas trails + SVG rhythm notation + semantic DOM controls.
- Primary journey: watch the phrase → wheel/select a beat → pointer or keyboard bends its direction/energy → save the simulated phrase.
- State mapping: active beat changes trail, body pose, rhythm marker, numeric direction/energy and foreground copy together.
- Constraints: no external services/assets, no Three.js, no fabricated real measurement, no fixed three-screen structure; all values are choreography simulation parameters.
- Surfaces: desktop, 390px compact control dock, keyboard, touch/pointer, reduced motion, `?fallback=1` SVG/CSS fallback.
- Completion: route builds; state and canvas react causally; save feedback is explicit; fallback remains operable; `window.__kineticScore.snapshot()` exposes inspectable evidence.
- Authorization: parent task explicitly requested direct autonomous implementation.

## Coverage

| Requirement | Evidence target | Status |
| --- | --- | --- |
| Full-screen score and new visual grammar | Chrome 1440×900 capture at `/pages/v2/deliveries/kinetic-score/` | pass |
| Wheel, pointer, keyboard causal edit | snapshot changed beat 0→1, direction −18°→46°, then save=true | pass |
| 390px, reduced motion, fallback | 390×844 capture; `?fallback=1` operable with overflow=false | pass |
| Build | `npm run build:pages` | pass |
