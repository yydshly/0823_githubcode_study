# Asset layering R22

## Goal

Validate the project’s core loop with a real material decision:

```text
brief -> generate an appropriate asset -> inspect its technical properties -> assign a scene role -> build and verify the Three.js result
```

## Asset roles

| Asset | Dimensions | Role | Runtime treatment |
| --- | ---: | --- | --- |
| `fashion-fluid-couture-v1.png` | 1672 × 941 | environment / palette source | wide feathered plane, low-opacity additive blend |
| `fashion-fluid-couture-cutout-v2.png` | 1024 × 1536 | transparent hero subject | PNG Alpha, segmented plane, vertex deformation, scroll dissolve |

The new foreground asset was created with the built-in image generation tool. It is an RGBA PNG with Alpha extrema `0–254`; it is not a black-background imitation.

## Runtime story

1. Establish: the complete transparent couture form appears between the headline and CTA.
2. Release: scroll increases vertex distortion and fragment-level dissolution while particles separate from the silhouette.
3. Resolve: the subject recomposes into a calm final collection composition.

## Generation rules learned

- Preserve the intrinsic aspect ratio of every raster asset.
- Use `tex.a` for true transparent subjects; do not infer Alpha from luminance.
- Assign multiple assets explicit subject, environment, texture, or foreground roles.
- Never stack multiple approved images as independent poster rectangles.
- Keep the SDK canvas, progress, and pointer timeline singular.

## Verification

- `npm run build`: pass; existing Vite chunk-size warning remains.
- Targeted asset and dedicated-generation tests: 9/9 pass.
- Desktop opening/ending and 390 × 844 reduced-motion browser verification: HTTP 200, one canvas, no overflow, no console/page errors.
- Evidence: `E:\0823_codex_project\.tmp\kage-layered-evidence`.
