# Phase 2 — Creative Workbench Contract

> This is the historical offline Phase 2 acceptance contract. Phase 3 adds optional server-side model providers without weakening these deterministic and validation requirements; see [Phase 3](PHASE3-MODEL-PROVIDERS.md).

## Design contract

- Entry mode: revision-led continuation of the Experience Lab.
- Request revision: 2.
- Target user and context: a creator or developer describing an immersive webpage before selecting implementation details.
- Desired first impression: one clear brief input, three materially different directions, and visible reasons for every choice.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace.
- Visual constraints: preserve the dark Signal Lab language; the workbench is readable without WebGL; preview remains a separate immersive route.
- Information constraints: distinguish user text, inferred intent, capability selection, budget decision, generated manifest, and unsupported needs.
- Operation constraints: keyboard-reachable generate, candidate selection, preview, reset, and shareable URL; no external model or storage dependency.
- State constraints: initial example, valid candidates, validation failure, selected direction, and semantic fallback must be understandable.
- Environment constraints: Vite/TypeScript, current Three.js runtime, deterministic local provider, desktop and 390px mobile.
- Primary journey: enter brief → generate three candidates → compare structure/visual/cost → select → open real preview.
- User-defined phases: natural-language exploration, multiple creative directions, architecture quality, browser-verifiable demo.
- Required artifacts: compiler contracts, baseline provider, workbench route, tests, final desktop/mobile evidence, implementation notes.
- Autonomy authorization: “继续我们的项目” authorizes reversible in-scope implementation and verification.
- User-decision boundary: real LLM provider, credentials, paid calls, persistence, deployment, or production code execution remain outside scope.
- Observable completion criteria: same brief is deterministic; candidates differ in scene or structure; every manifest validates; capability plans contain no missing entries; selected candidate opens a matching preview; journey works at 1440px and 390px.

## Architecture boundary

```text
CreativeBrief text
  -> BriefInterpreter provider
  -> IntentEvidence + 3 CandidateDirections
  -> ManifestCompiler
  -> Experience validator + CapabilityPlan
  -> Workbench compare/select
  -> generated manifest store -> existing /index.html?generated=... preview
```

The provider may later be an LLM. It cannot bypass manifest validation, capability planning, or the preview runtime.

## Coverage manifest

| Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| Deterministic brief compiler | unit / default and custom input | 4 generation assertions | 5 | pass | keep baseline as regression oracle |
| Three differentiated candidates | desktop workbench | focus/journey/branching DOM + snapshots | 3–6 | pass | add more topology grammars later |
| Candidate opens real preview | selected candidate | generated ID, flow and plugin match | 5 | pass | retain local validation boundary |
| Invalid/empty input feedback | workbench error state | role=alert browser assertion | 6 | pass | provider errors use same surface |
| Keyboard journey | workbench controls | Enter-driven example generation | 7 | pass | maintain native controls |
| 390px journey | mobile workbench | overflow assertion + screenshot | 7 | pass | recheck when fields expand |
| Existing experience regressions | immersive preview routes | build + 19 unit + 18 browser tests | 9 | pass | run full suite before merge |
| Documentation and evidence | docs/screenshots | pipeline doc + desktop/mobile captures | 9 | pass | update with each provider |
