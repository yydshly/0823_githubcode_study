# Core creation loop return · R29

## Why this revision exists

The project goal remains:

> A user describes an intended idea; the system analyzes the intended effect, generates or selects suitable assets, builds an original Three.js webpage, shows the real result, and supports evidence-based refinement until one best result remains.

R29 corrects two drifts:

1. Asset intake had started to look like the product itself. It is now a conditional support path, shown only when the brief explicitly requires a real external asset.
2. Local generation produced a new manifest but intentionally kept the old stage preview. The stage now always renders the current selected result, regardless of provider.

## Product flow after R29

```text
idea / brief
  -> interpretation + effect specification
  -> best runnable direction
  -> current result shown immediately in the main stage
  -> asset resolution gate
       -> procedural route: continue directly
       -> approved/generated asset: continue with evidence
       -> required real asset missing: show conditional intake and hold code generation
  -> Codex dedicated webpage bundle
  -> TypeScript compile + sandboxed preview
  -> browser evidence + visual refinement
  -> keep one best result for the target
```

The intake panel is not a mandatory product step. Ordinary shader, procedural, DOM/WebGL and generative compositions remain one-click routes.

## Asset truth

User files supported by the local intake contract:

- PNG / JPEG
- GLB 2.0
- MP3 / WAV
- MP4 / WebM
- maximum payload: 20 MB

An imported file is recorded as `L2-inspectable`, `publishable=false`, with no inferred license. File signatures and local addressability are checked before it can enter model context. Visual quality, close-up fitness and rights still require separate review.

## Runtime evidence

Verified on 2026-08-26 at `http://127.0.0.1:8143/workbench.html?provider=local`.

Brief:

> 为一款新型声学设备设计发布网页：需要真实 GLB 产品拆解、随音乐响应，并能导出 MP4 自动成片。

Observed result:

- generated run changed from the default brief to `run-1xg5dow`;
- selected page changed to `generated-8mt05u-guided-journey`;
- the main iframe visibly contained the new acoustic-device brief;
- the asset gate reported missing required `model-3d` / `product-model`;
- the conditional file intake became visible;
- code generation stayed at `NOT STARTED`;
- no `codex exec` process was started;
- the previous preview remained available rather than being overwritten.

Screenshot: `evidence/workbench-r29-asset-gate.png`.

## Verification

- production build: passed;
- Vitest: 29 files, 86 tests passed;
- browser: meaningful content, no Vite error overlay;
- two representative workbench examples remained accessible;
- no new case was archived.

## Next mainline work

R29 does not claim final visual quality. The next valuable milestone is a full non-placeholder creation run:

1. choose one fresh brief that does not require an unavailable hard asset, or provide a real asset;
2. generate the dedicated Codex page;
3. capture opening, middle, ending and mobile states;
4. refine composition, motion and material integration from evidence;
5. archive only the best final result and record rejected approaches in research notes, not as cases.
