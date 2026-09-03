# V2 Decision Layer R07 — Delivery Contract

## Entry and authority

- Entry mode: revision-led implementation.
- Request revision: R07.
- Authorization: the user confirmed direct continuation.
- User-decision boundary: no unresolved material product choice; the change is reversible and local to V2.

## Outcome

Insert an evidence-guided decision layer between a natural-language brief and Codex authoring. The layer must narrow ineffective exploration without turning the system into a fixed-template selector.

## Primary journey

1. A visitor describes the desired subject, feeling, change, and action.
2. V2 derives the primary visual role.
3. V2 selects one to three compatible visual mechanisms and explains their jobs.
4. V2 defines the semantic input behavior and renderer route.
5. The complete decision remains visible in the workbench and inside the Codex authoring prompt.

## Experience architecture

- Visual ambition: Editorial + Immersive decision workspace.
- Architecture: Editorial Flow.
- Readable base: semantic DOM; visual mechanisms are planning evidence, not a mandatory live effect on the composer page.
- Enhancement boundary: renderer choices describe the generated page, not the composer itself.

## Constraints

- Do not copy local exemplar source or external assets.
- Do not force Three.js when media, DOM, or Canvas is sufficient.
- Do not select an unvalidated interaction as a primary mechanism without its required fallback.
- Do not replace existing experience beats, asset responsibilities, references, capability selection, or acceptance checks.
- Select mechanisms by visual responsibility and narrative action, not by aesthetic keywords alone.
- Preserve one-result-only and bounded-refinement policies.

## Observable completion criteria

- Dream/environment briefs expose an environment-led media route and a continuous narrative mechanism.
- Independent product/material briefs expose a subject-led route and subject-safe composition.
- Real GLB/deconstruction briefs expose a Three.js spatial route and explicit model-quality boundary.
- Pointer interaction is secondary unless the brief explicitly makes discovery or inspection meaningful.
- The workbench visibly renders role, mechanisms, interaction meaning, renderer route, rationale, and fallback.
- The Codex authoring prompt contains the full decision object.
- Existing V2 contracts remain schema-valid; tests and production build pass.

## Coverage

| Requirement | Surface/state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| Decision schema and catalog | TypeScript | 6 director tests | 3 | pass | Implemented in experience-director.ts |
| Dream/environment routing | contract creation | Environment + media assertions | 3 | pass | Environment aperture and state storyboard selected |
| Product/material routing | contract creation | Subject + Canvas assertions | 3 | pass | Subject field selected without implicit brand mask |
| GLB/Three.js boundary | contract creation | Model + Three.js assertions | 3 | pass | Real-model route and deconstruction gate selected |
| Prompt integration | authoring prompt | Direction JSON assertion | 5 | pass | Complete direction is preserved |
| Visible decision explanation | V2 composer desktop | Four live brief states, no page errors | 5 | pass | Role, mechanisms, interaction, renderer and fallback visible |
| Responsive decision explanation | V2 composer mobile | 390px DOM metrics, no overflow | 7 | pass | Decision panel converts to one column |
| Engineering closure | repository | 139 tests + two production builds | 9 | pass | Lab and Pages builds pass |
