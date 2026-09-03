# V2 R91 — Primary Journey Probe

## Design contract

```text
Entry mode: bounded browser-proof hardening
Request revision: R91
Target user and context: a user expects the generated page to make its core operation and result understandable without manually diagnosing implementation details
Desired first impression: the primary input causes a visible change in the intended subject, the result updates consistently, and the final action remains available
Visual ambition: inherited from the brief; the probe judges causality, not taste or style
Experience architecture: reuse the existing contract-derived review checkpoint; add no page, chapter, screenshot slot, candidate, or fixed screen count
Visual constraints: compare the same explicit visual anchor before and after one real input; reject static anchors and mechanically identifiable framing/style substitutes
Information constraints: the explicit primary result must change consistently and the explicit final action must remain rendered, enabled, and horizontally reachable
Operation constraints: execute exactly one real input for the primary journey—wheel for native scroll, one real marked control action for pointer/direct navigation
State constraints: collect before/after evidence on a fresh page; produce one ordered diagnostic finding; never initiate repair, regeneration, refinement, review-model calls, archive, or retry
Primary journey: real input -> same visual anchor changes -> primary result changes -> final action remains available
Required artifacts: contract-derived causal probe specification, browser evidence, mechanical assessment, deterministic browser fixtures, tests, this record
Autonomy authorization: implement locally inside the existing review plan and browser evidence path
User-decision boundary: no new model calls, assets, generated runs, cases, remote writes, or automatic retry loops
```

## Scope

R90 made the one-pass authoring prompt precise. R91 closes the next gap: the browser must prove that the generated implementation obeys the primary causal journey.

The probe is orthogonal to the existing mutually exclusive review action. It may share a checkpoint with semantic interaction or shared-driver evidence, and it never expands the eight-checkpoint budget. Compatibility/fallback plans without the R90 `process-causal` blocker remain unchanged.

For a native-scroll journey the probe performs one real wheel input and does not require a fake control marker. For pointer or direct-navigation journeys it requires and operates one real visible `data-signal-primary-control`. Before and after that action it samples the same `data-signal-visual-anchor` and `data-signal-primary-result`, then checks `data-signal-primary-action` availability.

Mechanically identifiable substitutes—copy/highlight-only change, opacity/blur-only change, whole-anchor scaling, and framing/crop-only change—fail the preflight. A pair of browser captures cannot truthfully classify every possible Three.js camera cut, so ambiguous spatial discontinuity remains a continuity concern for independent visual review rather than a falsely precise mechanical claim.

## Coverage manifest

| Requirement | Surface / state | Evidence | Status |
| --- | --- | --- | --- |
| Select the probe from the existing V2 contract | review plan | only contracts containing blocker `process-causal` opt in | pass |
| Preserve the evidence budget | review plan | causal specification reuses the nearest representative desktop checkpoint | pass |
| Use one real native-scroll input | synthetic scroll fixture | one wheel action changes scroll state | pass |
| Use one real direct control input | synthetic control fixture | one marked range/select/button action changes value | pass |
| Prove the same visual anchor changes | browser evidence | before/after element signatures exceed the subject threshold | pass |
| Reject forbidden substitutes | browser evidence | copy-only, opacity/blur, whole-scale, framing-only fixtures stop | pass |
| Prove result and action continuity | browser evidence | result changes; action remains rendered, enabled, reachable | pass |
| Return one ordered failure | mechanical assessment | one `primary-journey-unverified` finding explains the first failed condition | pass |
| Stop before model refinement | preflight | any causal failure returns `stop` | pass |
| Preserve compatibility | legacy plan, focused/full tests, TypeScript, build | old plans parse and non-V2 flows do not opt in | pass |
| Avoid remote side effects | whole R91 | zero model, asset, generated-run, case, archive, or remote-write calls | pass |

## Completion boundary

R91 is complete when deterministic browser fixtures prove both wheel and direct-control success paths, the failure matrix produces one bounded diagnostic and preflight stop, the existing review budget remains unchanged, and the full local verification suite passes.

R91 does not claim that an existing archived page has visually improved. A later stage may run this probe against one newly generated candidate as part of the already-bounded generation workflow; it must not create an independent repair loop.

## Implementation result

- `visual-review-plan.ts` adds an orthogonal `causalProbe` specification (`wheel` or `control`) only for contracts whose `process-causal` acceptance is blocker-level.
- The specification is attached to the representative desktop checkpoint nearest the middle of the journey. Budget selection preserves it alongside semantic/shared-driver actions, so no page or screenshot slot is added and the eight-checkpoint ceiling remains intact.
- `probePrimaryJourney` runs inside the existing Playwright capture page and performs one real input. Native scroll uses `page.mouse.wheel`; pointer/direct-navigation uses one visible enabled `data-signal-primary-control`.
- Before and after the input it samples the same explicitly marked visual anchor and primary result in memory, confirms the anchor DOM identity remains stable, and checks that the final action remains rendered, enabled, pointer-available, and horizontally reachable.
- Semantic text descendants are hidden only during the in-memory anchor sample so copy or result text cannot inflate the subject pixel delta. This temporary capture style is removed immediately and does not alter the saved full-frame evidence.
- The mechanical gate returns one ordered `primary-journey-unverified` finding for the first failed condition: marker contract, real input, anchor identity, forbidden substitute/static anchor, result continuity, then final action availability.
- A causal failure makes preflight return `stop`. It explicitly disables the existing canvas-occlusion local repair branch, so the failure cannot cause a second capture, Codex acceptance, Sol refinement, archive, or retry loop.
- Workbench review modes now expose `真实输入 / 主体 / 结果 / 行动`, making the new proof visible without adding a new user-facing workflow.

## Verification

- Deterministic Playwright fixtures: 7/7 passed, covering wheel success, range success, copy-only rejection, opacity-only rejection, whole-scale rejection, framing rejection, disabled action, and missing real control (the final test shares the seven-fixture suite with the combined scale/framing case).
- Focused review, plan, service-boundary, and workbench regression: 73 tests passed.
- Full Vitest suite: 72 files, 366 tests passed.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: 184 modules transformed and Vite build passed. The existing large-chunk warning remains non-blocking and outside this stage.
- No model, image, asset, generated-run, case, archive, or remote-write call occurred in R91.

## Remaining boundary

R90 and R91 now cover “the model received a precise causal contract” and “the browser can mechanically prove the implementation followed the marked causal chain.” They still do not judge whether the chosen concept is emotionally strong, visually original, or aesthetically excellent; that remains the bounded independent visual review after mechanical preflight passes.

The next product-level step is not another protection layer. It is one controlled end-to-end generation using a new brief, followed by this strengthened preflight and the existing single independent visual judgment. The run must stop at the first conclusive failure and must archive only if both mechanical and visual gates pass.
