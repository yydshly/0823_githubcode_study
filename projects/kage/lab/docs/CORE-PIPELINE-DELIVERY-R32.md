# Core Pipeline Delivery R32

Entry mode: revision-led implementation  
Target: idea → model planning → truthful assets → dedicated Three.js page → browser review → final best result  
Visual ambition: Immersive  
Experience architecture: Hybrid Workspace  
Authorization: user confirmed direct continuation and required cases to follow the final generated effect.

## Contract

- The primary button creates an addressable server-side GenerationJob before any remote model call.
- Stages are persisted as planning, assets, authoring, reviewing/refining, complete, blocked, or failed.
- Refreshing the workbench can recover the job from the `job` URL parameter.
- Long code-generation and visual-refinement requests update the job on the server, independent of browser state.
- A completed job exposes one `bestRunId` and one final preview URL.
- Intermediate runs remain internal for evidence and rollback; they are not separate public cases.
- Case archival resolves refinement `selectedId` pointers and replaces older cases with the same brief.

## Coverage

| Requirement | Evidence | Status |
| --- | --- | --- |
| Job exists before model generation | `POST /api/creative/jobs` writes `generated/jobs/job-*.json` | pass |
| Refresh-retrievable status | `GET /api/creative/jobs/:id`; job id persisted in URL | pass |
| Server-owned long-stage updates | interpret, code generate, and visual refine endpoints update the same job | pass |
| Truthful asset block | asset gate writes `blocked` rather than continuing with placeholder assets | pass |
| Final-result selection | visual refinement writes `bestRunId`, receipt, decision, and scores | pass |
| Case means final best | archive follows `refinement.selectedId`; same-brief entries are superseded | pass |
| Engineering checks | 30 test files / 88 tests; TypeScript and Vite production build | pass |
| Browser baseline | workbench and `dedicated-328c292e3645` loaded with meaningful controls/content | pass |

## Handoff

The scoped R32 persistence and final-case semantics are closed. External image/model generation remains capability-dependent: when no suitable generator or source asset exists, the job stops at the asset gate and records the reason instead of claiming completion.
