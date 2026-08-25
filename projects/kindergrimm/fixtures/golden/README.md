# M3 golden recipes

`mosslight-core-2d-recipes.json` freezes 50 complete, deterministic Core recipes and their Visual Records for master seed `240824`.

Verify with:

```powershell
node projects\kindergrimm\scripts\verify-m3.mjs
```

The verifier checks the Pack and Renderer contracts, source-level independence, exact item count, recipe/visual fingerprints, uniqueness, three-species coverage, the declared `biped` support boundary and the Original / Decorator / Core 50-slot comparison record.
