# V2 R90 — Causal Authoring Contract

## Design contract

```text
Entry mode: contract-led local hardening
Request revision: R90
Target user and context: a user submits an idea and expects the generated page to explain what they do, what visibly changes, what the result means, and what they can do next
Desired first impression: within about ten seconds the subject, operation, visible response, business result, and final action are understandable
Visual ambition: inherited from each brief; R90 adds no fixed style
Experience architecture: inherited from the existing V2 contract; no new page template or fixed screen count
Visual constraints: preserve one subject identity, defining features, focal anchor, viewpoint, comparable scale band, and safe crop across meaningful states
Information constraints: result and final action remain distinct and semantically consistent
Operation constraints: one primary input drives the subject response and result from one causal state; real controls are marked, native scrolling is not disguised as a control
State constraints: opening establishes the subject; a process state proves the visible response; resolution retains subject, result, and final action; reduced motion may use discrete states but may not omit the causal chain
Primary journey: user input -> visible change in the same subject -> readable business result -> final action
Required artifacts: compiled execution contract, compact authoring payload, real authoring prompt rules, local tests, this research record
Autonomy authorization: continue directly inside the current project with deterministic code and local tests
User-decision boundary: no provider, asset, authoring, visual-review, refinement, job, run, or case creation during R90
```

## Scope

R89 proved that generic prompt prose was insufficient. Its mechanical review passed while the independent reviewer could not attribute the state changes to user action. R90 therefore strengthens the existing authoring boundary rather than adding another capability.

The persisted V2 creative-contract schema remains unchanged. A deterministic authoring contract is compiled from fields already present in that contract:

- primary input and operation;
- visual subject and required visible response;
- business result and final action;
- subject identity and framing continuity;
- explicit DOM evidence markers;
- forbidden substitutes such as copy-only changes, crop jumps, camera cuts, whole-subject scaling, and opacity-only changes.

This compiled object is included in both the full Codex execution brief and the compact payload used by the real server authoring path. It is one causal journey, not a page, chapter, screen, or fixed beat count.

## Coverage manifest

| Requirement | Surface / state | Evidence | Status |
| --- | --- | --- | --- |
| Preserve the R89 failure as the baseline | saved clock run | mechanical 100; visual revise 82 with causality and crop findings | pass |
| Extract the real subject from the R89 brief | V2 contract | subject is the same mechanical clock, not the opening workbench | pass |
| Compile the causal journey | full execution brief | input, operation, visual response, result, action, markers, single state | pass |
| Compile subject continuity | full execution brief | identity, framing rule, invariants, forbidden substitutes | pass |
| Preserve the contract in the compact authoring payload | real Codex authoring boundary | serialized payload contains both compiled objects | pass |
| Make causal acceptance blocking | acceptance contract | `process-causal` is a blocker and survives compact filtering | pass |
| Keep the real prompt aligned | dedicated server prompt | rules apply even when semantic interaction is not selected | pass |
| Avoid template regression | editorial, stateful scroll, semantic direct-state | no fixed screen count or forced new capability | pass |
| Preserve compatibility and payload budget | focused tests, TypeScript, build | existing contract parses; compact payload remains bounded | pass |
| Avoid remote side effects | whole R90 | zero new model calls, assets, runs, jobs, or cases | pass |

## Completion boundary

R90 is complete when the R89 brief and representative non-stateful/direct-state briefs prove that the compiled constraints reach the real one-pass authoring prompt, focused tests pass, TypeScript passes, and the production build succeeds. It does not claim that the already-generated R89 page has visually improved.

The later mechanical-proof stage may add a real wheel/control before-and-after causal probe. That work is deliberately not mixed into R90.

## Implementation result

- `codex-execution-brief.ts` now derives `authoring.primaryJourney` and `authoring.subjectContinuity` from the existing V2 contract and retains them in the compact one-pass authoring payload.
- The primary journey binds input, operation, same-subject visible delta, business result, final action, and stable DOM evidence markers to one causal state.
- Subject continuity preserves identity, defining features, focal anchor, viewpoint, scale band, and crop-safe framing while explicitly rejecting copy-only, control-highlight-only, crop-jump, camera-cut, whole-subject-scale, and opacity/blur-only substitutes.
- `process-causal` is now a blocking acceptance item. The dedicated server prompt applies the causal and continuity rules even when a scroll brief does not select semantic interaction.
- Subject extraction now keeps the R89 mechanical clock as the subject instead of promoting the opening workbench environment.
- Bounded evidence semantics were corrected: product state count remains truthful, while review coverage is measured against the planned representative desktop checkpoints. Five product states may therefore be proven by four representative desktop checkpoints plus mobile and fallback evidence without inventing a fifth screenshot or exceeding the eight-slot budget.
- Workbench status copy now distinguishes `检查点` from `产品状态`, so a passed bounded plan no longer appears as an incomplete `4 / 5` state review.

## Verification

- Focused authoring-boundary regression: 46 tests passed.
- Coverage-semantics regression: 12 tests passed.
- Full Vitest suite: 72 files, 355 tests passed.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: 184 modules transformed and Vite build passed. The existing large-chunk warning remains non-blocking and was not expanded into this stage.
- No browser generation, model authoring, image generation, independent visual review, refinement, archive, or case write occurred in R90.

## Next bounded stage

R91 should add one deterministic browser causal probe to the existing review machinery:

1. capture the primary visual anchor and result before a real wheel/control action;
2. perform one bounded real input action;
3. prove that the same subject changed, the result changed consistently, and the final action remains available;
4. fail once with an explicit reason when the evidence markers are absent or the change is only copy, highlight, crop, camera, scale, opacity, or blur;
5. do not trigger automatic regeneration or refinement from the probe itself.

This is the next gap between “the model received a precise causal contract” and “the generated page mechanically proves that it obeyed it.”
