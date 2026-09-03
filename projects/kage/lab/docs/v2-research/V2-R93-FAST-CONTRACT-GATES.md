# V2 R93 — Fast Contract-Aware Quality Gates

## Stage contract

```text
Entry mode: infrastructure refinement from one rejected R92 candidate
Request revision: R93
Target user and context: the existing idea-to-web pipeline needs to reject visually weak or explicitly forbidden output before spending another model review pass
Desired first impression: not applicable; this stage changes validation, not the product skin
Visual ambition: Utility
Experience architecture: existing adaptive review plan plus deterministic browser evidence
Visual constraints: preserve creative freedom unless the user explicitly forbids a treatment; do not impose a universal title size or universal visual-delta threshold
Information constraints: every rejection must report the observed value and the contract threshold
Operation constraints: reuse the existing browser capture; add no screenshots, provider calls, authoring attempts, or retry loops
State constraints: legacy and non-structural contracts keep their existing thresholds
Environment constraints: existing V2 runner, visual review plan, capture, assessment, and preflight only
Primary journey: compile candidate -> adaptive browser evidence -> contract-aware mechanical decision -> independent model review only when eligible
User-defined phases: one implementation pass, targeted tests, one local re-audit of the saved R92 run
Required artifacts: code, regression tests, R92 re-audit evidence, this record
Autonomy authorization: user authorized bounded staged development without repeated confirmation
User-decision boundary: no new theme, no new authoring, no visual model, no archive mutation
Observable completion criteria: the saved R92 candidate is stopped deterministically for the same issues later found by independent review, while legacy fixtures remain green
Coverage record: implementation and evidence below
```

## Problem proved by R92

The original R92 pass produced a mechanical score of 100, then independent visual review rejected it at 82. The gap had two deterministic causes:

- The contract explicitly said “不要巨大标题”, but the browser plan did not preserve that constraint and capture recorded only whether a heading existed.
- Every physical state used the same 1.8% subject-difference threshold. The R92 soundboard produced measurable but weak changes: 3.4% at the middle state, 5.7% across the real causal input, and 5.7% at the final state.

## Implemented gates

### Explicit heading constraint

The adaptive plan now normalizes `forbidGiantHeading` only when a user constraint contains a Chinese or English no-giant-heading expression. Browser capture measures the largest visible heading without another screenshot:

- painted height / viewport height;
- painted area / viewport area;
- computed font size.

When the explicit constraint exists, a heading is rejected when any value exceeds:

- height ratio `0.32`;
- area ratio `0.20`;
- desktop font size `96px`;
- mobile font size `64px`.

Boundary values are accepted. Contracts without the explicit constraint retain full creative freedom.

### Structural-deformation evidence

Legacy and non-structural journeys retain the existing `0.018` threshold. A contract whose required state asset declares `structural-deformation` now requires:

- later subject-state delta at least `0.045`;
- real-input causal-anchor delta at least `0.065`.

The raw deltas are compared in assessment rather than changing the global image-signature classifier, so the stricter rule cannot leak into unrelated themes.

## Real R92 re-audit

One local browser re-audit of `dedicated-b4d381a24320` ran against the saved bundle. It did not invoke Codex, MiniMax, ImageGen, or any refinement path.

| Finding | Observed | Required | Decision |
| --- | ---: | ---: | --- |
| Opening heading height | 34.2% | at most 32.0% | major |
| Middle soundboard state delta | 3.4% | at least 4.5% | major |
| Real wheel causal-anchor delta | 5.7% | at least 6.5% | major |

The same runnable candidate now receives mechanical `revise / 24`, and fast preflight returns `stop` before independent visual review. This agrees with the earlier independent findings instead of producing a mechanical false positive.

## Verification

- `97` targeted tests passed across review planning, visual assessment, code service, SDK lifecycle, and job recovery.
- `tsc --noEmit` passed.
- The real local browser re-audit completed in about `19s` with six adaptive checkpoints and no model call.
- The R92 Job remains `review-required` and the candidate remains outside the curated case library.

## Stage outcome

R93 is complete. It improves speed and quality control without adding a template, provider, retry, or visual style restriction. The next end-to-end validation may use one genuinely new theme; its purpose should be to prove that a strong candidate still passes these gates, not to reopen R92 or manually beautify the rejected soundboard page.
