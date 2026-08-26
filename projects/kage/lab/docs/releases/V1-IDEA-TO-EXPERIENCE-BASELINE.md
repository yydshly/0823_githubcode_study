# V1 — Idea to Experience Baseline

V1 is the archived, runnable baseline of the Kage research project. Its goal is simple: a user describes an intended web experience, the system interprets the brief, selects or generates assets, authors a Three.js experience, runs it, and preserves the strongest result as a case.

## What V1 proves

- Natural-language briefs can drive dedicated, runnable Three.js pages instead of only selecting a fixed visual template.
- Generated and curated visual assets can be integrated into the final page.
- Mouse, scroll and time-based motion can be authored as part of the experience.
- Generated bundles can be compiled, previewed, refined and archived.
- A small curated case library is more useful than retaining every intermediate attempt.

## Frozen V1 surface

- Workbench and generation pipeline under `src/` and `server/`.
- Runtime SDK and reusable Three.js capabilities.
- Six curated case bundles listed in `cases/catalog.json`.
- A static, independently deployable V1 gallery under `pages/v1/`.

V1 remains available as a reproducible reference while V2 evolves. V2 may reuse the stable runtime and schemas, but it must not silently change archived V1 cases or the V1 public route.

## Acceptance baseline

At archive time:

- Production build passes.
- 40 test files and 122 tests pass.
- All six curated case routes return successfully in the local runtime.
- The V1 static gallery and every archived case are built as GitHub Pages artifacts.

## Public routes

- Project: `/projects/kage/`
- V1 gallery: `/projects/kage/v1/`
- V2 research entry: `/projects/kage/v2/`

