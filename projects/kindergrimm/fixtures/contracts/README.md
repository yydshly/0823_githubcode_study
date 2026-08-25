# Contract fixtures

These fixtures are generated from the canonical NPC Factory runtime and are consumed without Three.js, Canvas, DOM, or the upstream rig.

- `original-manifest.json`: current Original 12-asset batch.
- `mosslight-v06-manifest.json`: current Mosslight v0.6 12-part batch.
- `mosslight-v05-compat-manifest.json`: current metadata rebuilt through the supported renderer v0.1.0 three-part path.
- `tampered-visual-fingerprint.json`: v0.6 with the first visual fingerprint replaced by `00000000`.
- `fixture-index.json`: expected accept/reject behavior and immutable historical v0.5 reference fingerprints.

The compatibility fixture is intentionally not labeled as the historical v0.5 payload. The historical full Manifest was not retained, so its known pack `f78b264d`, renderer `f7d84f29`, and first visual `aef31a9b` values remain reference evidence rather than a fabricated reconstructable file.

