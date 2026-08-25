# Kindergrimm 2D Platform v1 · Research Release

This artifact is the auditable handoff for the 2D-first deterministic game-asset platform proven in M0–M6.

## Verify

From the repository root:

    node projects/kindergrimm/scripts/verify-release.mjs

## Operate

1. Run `.\projects\kindergrimm\scripts\npc-factory.ps1`.
2. Open `/projects/kindergrimm/production-studio/`.
3. Author → Compare → Review → G1–G6 → build Release Candidate.
4. Open `/projects/kindergrimm/npc-scenarios/?seed=240824&pack=mosslight-core-2d`.
5. Verify Waystation, Encounter and Council preserve the same fingerprints.

## Locked identities

- Content Pack: mosslight-core-2d 0.1.0 / a96d877a
- Renderer: mosslight-core-2d 0.1.0 / 32d9c2cf
- Runtime SDK: kindergrimm-runtime-sdk 0.1.0
- Golden: 50 Recipe + 50 Visual fingerprints

This is a local research release, not an external publication. AI intent and 3D backends remain outside scope.
