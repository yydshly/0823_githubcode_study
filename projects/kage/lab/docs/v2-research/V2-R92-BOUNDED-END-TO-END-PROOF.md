# V2 R92 — Bounded End-to-End Proof

## Design contract

```text
Entry mode: brief-led validation inside the existing V2 project
Request revision: R92
Target user and context: a luthier learner adjusts a spruce soundboard and needs to understand the visible deformation, simulated acoustic result, risk, and next action
Desired first impression: a bright, tactile luthier workbench whose purpose and operation are understandable without reading a technical explanation first
Visual ambition: Immersive
Experience architecture: Hybrid Workspace
Visual constraints: warm-white workshop daylight; the same spruce soundboard remains the visual anchor; split process workspace; no dark technology shell, giant title, random particles, luminous sound waves, central floating product, or fixed three-screen story
Information constraints: baseline thickness and current thickness stay comparable; frequency and risk are explicitly labelled as teaching simulation; evidence, result, and action are distinct
Operation constraints: one thickness slider is the primary input; it must visibly change bending mode, nodal pattern, and local deflection on the same soundboard before updating the readable result
State constraints: baseline, adjusted, risk explanation, and saved state share one causal state model; reduced motion may use discrete states but may not remove the causal relationship
Environment constraints: existing V2 compiler, Three.js/Canvas/DOM capability, Codex authoring path, same-origin local preview; no new provider or backend architecture
Primary journey: adjust thickness -> same soundboard visibly changes -> simulated frequency/risk updates -> save this adjustment plan
User-defined phases: one candidate generation; real causal browser probe; independent visual decision; archive only if both gates pass
Required artifacts: one persisted job, one runnable candidate, bounded browser/visual evidence, latency record, this R92 record, optional curated case only after final eligibility
Autonomy authorization: the user authorized continuous implementation in bounded stages without repeated confirmation
User-decision boundary: do not create a second job, second candidate, extra asset batch, repeated model authoring, or unbounded refinement; stop on failed quality gate
Observable completion criteria: the page runs at the canonical route; real input changes the same subject and result while action remains available; desktop/mobile/reduced-motion/fallback remain usable; independent visual acceptance passes; every coverage row reaches a terminal pass, fail, or not-applicable decision
Coverage record: full manifest below
```

## Experience architecture

```text
Scene base: selected by the existing V2 contract and authoring route; Canvas, WebGL, SVG, or DOM are valid when the evidence contract is met
Scene persistence: the same soundboard remains visible throughout adjustment and resolution
Foreground control model: thickness slider, baseline/current readout, simulated frequency and risk, save action
State-to-scene mapping: baseline grain and deflection -> adjusted mode and nodes -> readable risk/result -> saved acknowledgement
Mobile transformation: persistent soundboard above or behind a compact reachable control sheet; no unrelated long-form page substitution
Fallback: readable semantic control, result, and action with a visible non-enhanced soundboard state
```

## R92 validation brief

> 为手工制琴师设计一张暖白工坊天光下的音板调校网页。左右对比基准厚度与当前厚度，工作区持续展示同一块云杉音板；拖动厚度滑杆时，音板弯曲模态、节点纹路与局部挠度必须在同一主体上同步变化，频率数据与风险解释随之更新，最后行动是“保存本次调校方案”。所有结果明确标为教学模拟。界面像制琴师的测量记录与木工台，不要暗色科技风、巨大标题、随机粒子、发光声波、中央悬浮产品或固定三屏。

This is a previously unused subject. It is intentionally adjacent to acoustic work but differs from prior sound-product cases through a bright split workshop, direct manipulation, measurement evidence, and one persistent material specimen.

## Coverage manifest

| User phase | Requirement or artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Goal lock | One new bounded theme and one causal journey | contract / brief | inspectable contract and theme search | 0 | pass | none |
| Runnable baseline | Canonical server and exactly one persisted job | `127.0.0.1:8143` | start command, provider status, job id | 1 | pass | none |
| Primary visual | Bright luthier workspace; same soundboard leads | desktop opening | real browser capture and visual assessment | 2 | fail | Subject and workshop are strong, but the giant opening title violates the brief |
| Information layout | Baseline/current, simulated result, risk, action remain legible | desktop active / result | browser observation and screenshot | 3 | fail | Result and teaching-simulation meaning are present but too subordinate for a non-expert |
| Control system | Thickness slider is discoverable and reachable | desktop and 390px | DOM and interaction evidence | 4 | pass | Browser evidence found one reachable control, result, and action on both surfaces |
| Foreground journey | Input changes same subject, result, and keeps action available | primary journey | R91 causal probe evidence | 5 | fail | Mechanical delta exists, but independent review found the visible deformation too weak; causality scored 70 |
| State feedback | Saved acknowledgement does not contradict simulation | saved / recovery | browser observation | 6 | fail | Action availability passed, but the save acknowledgement itself was not exercised by the adaptive plan |
| Cross-surface | Desktop, 390px, keyboard, reduced motion | required surfaces | bounded browser plan and observations | 7 | fail | Mobile/reduced-motion remain reachable; keyboard completion was not proven and mobile opening composition is weak |
| Fallback / performance | Base UI remains usable and work stays inside bounded execution windows | capability fallback / timings | browser fallback evidence and job phase durations | 8 | fail | Runtime is clean and bounded, but an explicit no-enhancement fallback capture was not produced |
| Quality decision | Mechanical and independent visual gates agree | final candidate | delivery-quality assessment | 9 | fail | Mechanical 100 does not override independent visual 82 / revise; final eligibility is false |
| Case curation | Only a final-eligible result enters the curated library | case catalog | archive receipt and working case URL | 9 | not applicable | Candidate was intentionally not archived |

## Bounded execution rules

- Canonical runtime: `npm.cmd run dev -- --host 127.0.0.1 --port 8143 --strictPort`.
- Create exactly one server-owned job with provider `codex`, quality `high`, seed `92`.
- Persist and poll the same job id; never repeat `POST /api/creative/jobs` for a slow response.
- Keep deterministic local planning. MiniMax remains only the existing asset fallback; it is not a mandatory stage.
- Accept at most one authoring call, one recovery of a saved candidate, and one evidence-gated refinement, as enforced by the runner.
- Each active execution or recovery window is capped at five minutes. A blocked asset request, failed causal probe, failed independent visual decision, or exhausted budget stops the stage instead of starting another exploration.
- Archive only when `deliveryQuality.finalEligible` is true and the final route is browser-verifiable.

## Runtime evidence

```text
Canonical origin: http://127.0.0.1:8143
Start command: npm.cmd run dev -- --host 127.0.0.1 --port 8143 --strictPort
Provider status: Codex available / gpt-5.6-terra authoring role
Job id: job-96ee8cc509d90f51
Job creation count: 1
Quality / seed: high / 92
Execution owner: server
Generated asset: public/creative-assets/r92-luthier-soundboard-state-atlas-v1.png
Generated asset id: asset-22b7fff5e0a6259f
Asset source / quality: ChatGPT ImageGen / L3-presentable
Recovered run id: dedicated-b4d381a24320
Recovered preview: http://127.0.0.1:8143/generated-runs/dedicated-b4d381a24320/?quality=high&motion=full
Job terminal state: review-required
Mechanical assessment: pass / 100
Independent visual acceptance: revise / 82
Experience assessment: revise / 88; interaction causality 70
Delivery finalEligible: false
R93 contract-aware re-audit: revise / 24; fast preflight stop before model review
```

## Terminal result

The single candidate is runnable but is not a final-quality delivery. The independent reviewer accepted the subject asset, workshop continuity, and basic mobile path, then rejected final delivery for five concrete reasons:

1. The slider-driven change is mechanically detectable but visually too subtle to prove a meaningful soundboard deformation.
2. Nodal pattern, local deflection, thickness, and frequency do not read as one strong causal result.
3. The teaching-simulation meaning and user outcome are visually subordinate to specialist measurements.
4. The opening giant title directly violates the requested restrained luthier-record direction.
5. The mobile opening lets the title occupy the task-entry area before the control.

The runner therefore stopped at `review-required`, consumed no second authoring call, and did not write this candidate into the curated case library.

## Infrastructure findings resolved during R92

- The generated SDK previously accepted only `mount(): void | Promise<void>`. Terra returned a coherent nested `update/resize/dispose` lifecycle, which caused one root TypeScript error and two secondary implicit-any errors. The SDK now accepts either top-level lifecycle callbacks or one complete lifecycle returned by `mount`; the runtime selects one group, rejects partial groups, and disposes once.
- Authoring-candidate recovery previously inherited an expired job deadline before incrementing its recovery count. Recovery now opens one new bounded window first, then replays the saved candidate. It still permits only one real recovery and never calls the authoring model again.
- The compatibility and deadline changes passed 46 targeted tests plus `tsc --noEmit` before the saved candidate was replayed.

## Latency evidence

| Stage | Recorded active time | Result |
| --- | ---: | --- |
| Deterministic planning | 53 ms | pass |
| Asset gate bookkeeping | 55 ms | pass; external ImageGen creation is outside this counter |
| Terra authoring plus recovered compile | 62,126 ms | one authoring call; recovered compile itself 455 ms |
| Browser and independent visual review | 73,353 ms | terminal revise decision |
| Recorded active pipeline total | 135,587 ms | about 2m 16s, excluding asset intervention and engineering diagnosis |

The dominant compute time was model authoring and visual review, not local TypeScript compilation. R92 also proved that stale-deadline and SDK protocol defects can add wall-clock delay without adding visual quality; both are now covered by regression tests.

## Follow-up gate stage

The rejected candidate was not manually beautified or archived. R93 turned the R92 findings into fast reusable gates before another theme is generated:

1. Explicit giant-title constraint drift is now measured and rejected before model review.
2. Structural deformation now requires stronger subject and causal-anchor deltas while other contracts retain the legacy threshold.
3. A real local re-audit stopped this candidate at mechanical 24 for the same three issues later identified by independent review.
4. Simulation-label and plain-language outcome prominence remains an independent visual responsibility; it was not converted into a brittle keyword rule.

See `V2-R93-FAST-CONTRACT-GATES.md` for the completed follow-up stage.
