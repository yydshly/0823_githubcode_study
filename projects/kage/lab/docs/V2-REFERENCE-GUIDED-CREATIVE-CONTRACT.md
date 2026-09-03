# V2.0–V2.2 — Reference-Guided Creative Contract（历史）

> 本文记录早期 V2.0–V2.2 的探索合同，不再代表当前产品协议。其固定参考数量、Three.js 偏好和失败后候选策略已被后续验证修正。当前唯一版本真相见 [V2.5 Direct Creative Baseline](releases/V2.5-DIRECT-CREATIVE-BASELINE.md)。

V2 keeps the V1 objective—turn an idea into an excellent Three.js web experience—but narrows the model's search space with evidence and explicit decisions.

## V2 target

Given one natural-language idea, produce one independently runnable page whose composition, assets, motion and interaction clearly express that idea. The system should reach a convincing first result faster and need fewer blind refinement loops.

## Generation contract

Each run must produce a compact contract before code authoring:

1. **Intent** — audience, desired feeling, narrative change and final action.
2. **Reference evidence** — two or three relevant patterns extracted from strong examples; never a request to clone a page.
3. **Composition** — focal subject, typography role, depth layers and visual continuity.
4. **Asset plan** — required asset, source or generation method, visual role and fallback.
5. **Motion score** — opening state, scroll transitions, pointer response and reduced-motion behavior.
6. **Technical budget** — runtime capabilities, quality tier, asset limits and performance limits.
7. **Acceptance** — observable checks tied to the original idea.

## Architecture boundary

```text
idea
  -> intent parser
  -> reference/evidence selector
  -> creative contract
  -> asset planner and generator
  -> Three.js authoring
  -> deterministic checks
  -> bounded visual review
  -> independent artifact + one curated case
```

V2 may reuse V1's stable runtime SDK, schemas, compiler and asset storage. V2 owns its planner, evidence library, contract, acceptance policy and public demo. V1 source and archived V1 cases remain frozen.

## Milestones

### V2.0 — Contract foundation

- Preserve the complete plan through the model authoring request.
- Add reference evidence and asset-role fields.
- Create the independent `/projects/kage/v2/` demo and reporting surface.

### V2.1 — Guided generation

- Retrieve a small relevant precedent set.
- Enforce asset visibility and interaction requirements.
- Produce one candidate first; create another only when a named acceptance check fails.

### V2.2 — Quality and speed proof

- Compare V1 and V2 on the same briefs.
- Measure time to first usable result, number of model passes, visual acceptance and runtime performance.
- Promote only the best result for each target into the curated library.

## Stop rule

V2 is successful when it produces a clearly related, asset-complete and independently runnable experience within a bounded generation cycle. New capabilities are added only when a failed target demonstrates that they are necessary.
