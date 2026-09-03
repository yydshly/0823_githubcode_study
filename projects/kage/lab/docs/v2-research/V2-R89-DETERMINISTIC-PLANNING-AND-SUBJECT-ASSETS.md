# V2 R89 — Deterministic Planning and Subject-Grounded Assets

## Stage goal

Run one previously unused idea through the R88 path, measure the real latency, and stop after one bounded quality decision:

`idea → deterministic contract → subject asset → one authoring pass → browser evidence → one visual decision`

R89 does not keep refining a rejected page and does not archive a merely runnable candidate.

## Measured baseline

The first mechanical-clock restoration run exposed two unrelated costs:

- local V2 contract construction: **53 ms**;
- remote creative interpretation: **92,767 ms**, ending in a planning timeout;
- asset resolution: **219 ms**;
- Codex page authoring: **60,831 ms**;
- visual review: **45,730 ms**.

The timed-out interpretation also selected the mortise-and-tenon museum asset because generic workflow words such as “修复” and “档案” outweighed the actual subject. The resulting page was rejected at 48 points. It was not archived.

## Implemented changes

### Deterministic planning by default

- V2 jobs now use the local deterministic interpreter by default.
- Remote creative planning is an explicit opt-in through `SIGNAL_REMOTE_CREATIVE_PLANNING=1`.
- A retryable planning timeout may recover once with the same persisted contract and local interpretation.
- Contract drift, a second recovery, or a local recovery failure stops the job.

This removes a redundant model call while leaving Codex responsible for the bespoke page implementation.

### Subject-grounded asset selection

- Creative assets can declare `topicAnchors` separately from generic workflow tags.
- Workflow similarity may rank a candidate, but it cannot select an asset unless the subject anchors match.
- Generic phrases such as “修复档案 / 拆解 / 校准” therefore no longer select an unrelated wooden-joint asset.
- A dedicated four-state mechanical-clock atlas was generated and registered as `clock-restoration-four-state-v1`.

### Honest browser coverage

- Scroll-timeline experiences now capture mobile opening, middle, and final checkpoints instead of only the opening screen.
- Desktop representative frames are compressed when necessary so the review remains bounded.
- Workbench job creation is inside the visible error boundary, so a creation failure cannot leave the UI looking indefinitely busy.

## Corrected run

Run: `dedicated-c45530463bb6`

- deterministic planning: **68 ms**;
- subject-asset resolution: **184 ms**;
- Codex page authoring: **91,140 ms**;
- initial visual review/refinement budget: **79,690 ms**;
- later bounded mechanical re-audit: **14,525 ms**, pass / 100;
- independent final visual decision: **47,011 ms**, revise / 82.

The corrected page uses the four-state clock asset, has working desktop/mobile layouts, no horizontal overflow, and real scroll/state deltas. The final visual reviewer still found the causal story too weak: the page did not make “user action → repair evidence → appointment action” explicit enough, and the subject framing changed too much between states.

## Latency conclusion

The local machine is not the dominant bottleneck. Planning and asset routing are now sub-second. Remaining wall time is dominated by two intentionally bounded model jobs:

1. bespoke page authoring (about 91 seconds in this run);
2. independent visual judgment (about 47 seconds on the final audit).

The former redundant 93-second planning call has been removed from the default path. No second asset generation, authoring retry, or visual-refinement loop ran after the final decision.

## Quality decision

The run is a useful research candidate but is **not a featured case**:

- mechanical/browser evidence: pass / 100;
- independent visual quality: revise / 82;
- archive decision: stop and do not archive.

This is the intended quality-gate behavior: “can run” is not treated as “excellent”.

## Exit condition

R89 is complete because the latency source is measured, redundant remote planning is removed, asset selection is subject-grounded, mobile evidence is representative, and the fresh idea reached one explicit bounded decision without an infinite recovery loop.

The next stage should improve the authoring contract for interaction causality and stable subject framing before spending another model run. It should not add more providers or more generic examples.
