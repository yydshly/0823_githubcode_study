# Workbench typography and one-click generation repair

Date: 2026-08-26
Scope: repair the primary workbench without adding another demo or case.

## Observed defect

At a 763 × 494 embedded preview, the shared full-page title rule produced a 76.3 px headline with a 201.4 px title block. The title dominated the preview and obscured the intended scene hierarchy.

Root cause: a 10vw full-page title scale was reused inside a narrow iframe without an embed-specific upper bound.

## Product decision

The primary path is now one action:

1. Describe the intended webpage.
2. Click 生成并构建最佳网页.
3. The workbench interprets the idea, evaluates asset needs, prepares the selected direction, and automatically starts the Codex dedicated-page build.
4. The compiled result replaces the stage preview.

The separate Codex button is no longer part of the normal path. It appears only when a real asset must be supplied or a failed build needs an explicit retry.

## Repair

- Added an embed-specific readable title width and a 5.5 rem upper bound to the baseline preview.
- Added embed=1 only to the workbench iframe URL; opening the full page keeps the original full-screen composition.
- Added a host-level h1 guard for generated bundles in embedded mode.
- Added generation constraints: desktop hero title <= 96 px, 390 px mobile <= 64 px, title block <= 42% of the first viewport.
- Fixed the asset-intake listener so it is registered once rather than once per generation event.

## Browser evidence

After repair, at the same 763 × 494 preview:

- title font: 45.78 px
- title block: 129.09 px
- iframe scroll width equals client width: 763 px

At 390 × 844:

- embedded frame width: 357 px
- title font: 41.6 px
- document and iframe have no horizontal overflow

Primary action text is 生成并构建最佳网页. The manual Codex button is hidden in the normal ready state.

Evidence image: evidence/workbench-r30-one-click-final.png

## Verification

- npm run build: passed
- vitest: 29 files, 86 tests passed
- generated embedded route: HTTP 200 and contains the embed typography guard