import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const showcaseRoot = resolve(projectRoot, 'showcase');
const upstreamRoot = resolve(projectRoot, 'upstream');
const modules = new Map([
  ['/@cot-research/product-workbench.js', ['\0cot-product-workbench.js', 'product-workbench-v2.js']],
  ['/@cot-research/product-workbench.css', ['\0cot-product-workbench.css', 'product-workbench.css']],
  ['/@cot-research/neutral-inspection-scene.js', ['\0cot-neutral-inspection-scene.js', 'neutral-inspection-scene.js']],
  ['/@cot-research/industrial-showroom-config.js', ['\0cot-industrial-showroom-config.js', 'industrial-showroom-config.js']],
  ['/@cot-research/industrial-showroom-asset.js', ['\0cot-industrial-showroom-asset.js', 'industrial-showroom-asset.js']],
  ['/@cot-research/nova-field-node-asset.js', ['\0cot-nova-field-node-asset.js', 'nova-field-node-asset.js']],
  ['/@cot-research/product-subject-adapter.js', ['\0cot-product-subject-adapter.js', 'product-subject-adapter.js']],
  ['/@cot-research/product-subject-registry.js', ['\0cot-product-subject-registry.js', 'product-subject-registry.js']],
]);

const resolvedModules = new Map(
  [...modules.entries()].map(([publicId, [resolvedId, filename]]) => [
    publicId,
    { resolvedId, file: resolve(showcaseRoot, filename) },
  ]),
);

const pagesWorkbenchPlugin = {
  name: 'cot-pages-product-workbench',
  resolveId(id) {
    return resolvedModules.get(id)?.resolvedId || null;
  },
  load(id) {
    const entry = [...resolvedModules.values()].find((candidate) => candidate.resolvedId === id);
    if (!entry) return null;
    this.addWatchFile(entry.file);
    return readFileSync(entry.file, 'utf8');
  },
};

export default {
  root: showcaseRoot,
  base: './',
  publicDir: false,
  plugins: [pagesWorkbenchPlugin],
  resolve: {
    alias: [
      {
        find: 'three/examples',
        replacement: resolve(upstreamRoot, 'node_modules/three/examples'),
      },
      {
        find: 'three',
        replacement: resolve(upstreamRoot, 'node_modules/three/build/three.module.js'),
      },
    ],
  },
  build: {
    outDir: resolve(projectRoot, '.pages-dist/workbench'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(showcaseRoot, 'product-workbench-pages.html'),
    },
  },
};
