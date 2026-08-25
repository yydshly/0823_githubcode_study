# Local upstream extension patch

The research platform used one narrow local delta against the pinned upstream revision: `studio-object3d-extension.patch` adds generic `Object3D` mount/unmount and per-frame tick registration hooks to Scene Studio.

This is a research integration patch, not an upstream feature claim. The upstream gitlink remains pinned at `fba54d06a5ccf1053477efde5e60bb9b338584e9`; the patch is stored outside the submodule so the experiment can be reproduced without publishing a dirty upstream checkout.

Capture the current delta:

```powershell
node projects/claude-of-tanks/scripts/capture-upstream-patch.mjs
```

Apply it to a clean pinned submodule:

```powershell
git -C projects/claude-of-tanks/upstream apply ../patches/studio-object3d-extension.patch
```

Verify the adjacent `.sha256` file before applying the patch to another checkout.
