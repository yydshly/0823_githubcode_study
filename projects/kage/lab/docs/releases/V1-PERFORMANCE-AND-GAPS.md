# V1 Performance and Gaps

This document records the limits of V1 so V2 can improve the system instead of repeatedly polishing isolated examples.

## Observed generation time

The archived job histories contain 16 recorded jobs and 3 complete end-to-end jobs.

| Metric | Observed value |
| --- | ---: |
| Median complete duration | 368.9 s |
| Median model authoring | 155.6 s |
| Median review and refinement | 121.4 s |
| Slowest complete duration | 639.7 s |

One representative archived job spent 254.5 seconds in authoring and 114.1 seconds in refinement. Compilation itself took less than one second. Several failed runs spent 300–975 seconds in refinement.

## Where the time goes

The main cost is model exploration and repeated visual refinement, not Three.js compilation and not the local computer. V1 gives the authoring model a broad brief but loses much of the structured creative intent when constructing the final authoring request. The model therefore has to rediscover composition, asset use, interaction and visual hierarchy during each run.

## Product gaps

1. **The creative contract is incomplete.** Rich planning data exists, but the final authoring stage receives only a reduced subset.
2. **Reference knowledge is passive.** Curated cases are displayed, but their successful composition and motion decisions do not yet guide new generations.
3. **Asset roles are weakly enforced.** A generated asset may exist without becoming an essential foreground, depth or transition element.
4. **Acceptance is inconsistent.** Some archived results can be accepted without a complete visual score.
5. **Refinement is open-ended.** The system lacks a strict time budget, defect priority and stop condition.
6. **Static delivery was not a first-class output.** V1 originally depended on the local workbench server; the archive adds a reproducible Pages build.

## V2 constraints derived from V1

- Give the model a bounded creative contract, not an unrestricted brief.
- Retrieve a small number of relevant design precedents and explain why each is relevant.
- Require every requested asset to have a declared visual role and a visible proof.
- Separate fast structural checks from limited, high-value visual refinement.
- Preserve one best result per idea and keep intermediate attempts out of the public case library.
- Treat an independently deployable artifact as part of the definition of done.

