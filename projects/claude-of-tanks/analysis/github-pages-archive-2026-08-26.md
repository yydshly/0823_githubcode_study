# GitHub Pages archive release / 2026-08-26

## Release intent

Publish the minimum useful public surface for Phase 01 and archive the research without presenting local-only experiments as production features.

Public surfaces:

1. `docs/projects/claude-of-tanks.html` — upstream capability overview and bounded local findings.
2. `docs/projects/claude-of-tanks-archive.html` — Phase 01 conclusion, reuse boundary, risks, evidence, and restart conditions.
3. `projects/claude-of-tanks/showcase/product-workbench-pages.html` — a build input for the independently deployable Three.js product workbench.

The deployed workbench is intentionally `WORLD:NONE` and uses zero external 3D models. The desert capability scene and visual-layer lab remain local research routes because they depend on the full upstream game runtime and the recorded Studio integration patch.

## Reproducibility

- Parent repository baseline before this release: `9a7763125ec14fdf188ede46bd9e372b311c30a4`.
- Upstream Claude of Tanks revision: `fba54d06a5ccf1053477efde5e60bb9b338584e9`.
- The local Studio delta is preserved under `patches/` with a SHA-256 checksum.
- Browser reports and curated screenshots remain under `evidence/`; the Phase 01 manifest remains under `archive/threejs-capability-research-phase-01-2026-08-26/`.

## Publication boundary

Published:

- static summaries and archive explanations;
- the standalone procedural product workbench;
- curated evidence needed to audit the stage conclusion;
- scripts, registry, reports, and the local upstream patch needed to reproduce the study.

Not published as a live Pages surface:

- the full upstream battle runtime;
- the local desert visual-layer lab;
- obsolete industrial-showroom experiments;
- transient `.vite`, `.tmp`, raw video, and duplicate historical screenshots.

The upstream live game remains the correct public destination for the original battle experience.

## Rollback

If the Pages release fails, redeploy the Pages artifact from parent commit `9a7763125ec14fdf188ede46bd9e372b311c30a4`, then investigate the release commit without rewriting the Phase 01 evidence.
