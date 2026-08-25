import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import upstreamConfig from '../upstream/vite.config.js';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const modules = new Map([
  ['/@cot-research/capability-showcase.js', {
    id: '\0cot-capability-showcase',
    file: resolve(projectRoot, 'showcase/capability-showcase.js'),
    capability: true,
  }],
  ['/@cot-research/visual-layer-lab-preload-r8.js', {
    id: '\0cot-visual-layer-lab-preload-r8',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-preload-r8.js'),
  }],
  ['/@cot-research/visual-layer-lab-core.js', {
    id: '\0cot-visual-layer-lab-core',
    file: resolve(projectRoot, 'showcase/visual-layer-lab.js'),
  }],
  ['/@cot-research/visual-layer-lab-entry.js', {
    id: '\0cot-visual-layer-lab-entry',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-entry.js'),
  }],
  ['/@cot-research/visual-layer-lab-refinement-r2.js', {
    id: '\0cot-visual-layer-lab-refinement-r2',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-refinement-r2.js'),
  }],
  ['/@cot-research/visual-layer-lab-single-hero-r3.js', {
    id: '\0cot-visual-layer-lab-single-hero-r3',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-single-hero-r3.js'),
  }],
  ['/@cot-research/visual-layer-lab-layout-fix-r2.js', {
    id: '\0cot-visual-layer-lab-layout-fix-r2',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-layout-fix-r2.js'),
  }],
  ['/@cot-research/visual-layer-lab-tools-layout-fix-r2.js', {
    id: '\0cot-visual-layer-lab-tools-layout-fix-r2',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-tools-layout-fix-r2.js'),
  }],
  ['/@cot-research/visual-layer-lab-reduced-motion-r9.js', {
    id: '\0cot-visual-layer-lab-reduced-motion-r9',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-reduced-motion-r9.js'),
  }],
  ['/@cot-research/visual-layer-lab-cinematic-camera-r10.js', {
    id: '\0cot-visual-layer-lab-cinematic-camera-r10',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-cinematic-camera-r10.js'),
  }],
  ['/@cot-research/visual-layer-lab-camera-lock-r11.js', {
    id: '\0cot-visual-layer-lab-camera-lock-r11',
    file: resolve(projectRoot, 'showcase/visual-layer-lab-camera-lock-r11.js'),
  }],
]);

const bootstrapId = '/@cot-research/visual-layer-lab-bootstrap.js';
const bootstrapResolvedId = '\0cot-visual-layer-lab-bootstrap';
const capabilityMarker = 'window.__COT_CAPABILITY_SHOWCASE = controller;';
const capabilityPreload = `${capabilityMarker}\n\nif (new URLSearchParams(location.search).get('lab') === 'layers'\n  && new URLSearchParams(location.search).get('showcase') === 'capabilities') {\n  await import('/@cot-research/visual-layer-lab-preload-r8.js');\n}`;
const bootstrapSource = `
const params = new URLSearchParams(location.search);
if (params.get('showcase') === 'capabilities') {
  await import('/@cot-research/capability-showcase.js');
  if (params.get('lab') === 'layers') {
    await import('/@cot-research/visual-layer-lab-entry.js');
    await import('/@cot-research/visual-layer-lab-refinement-r2.js');
    await import('/@cot-research/visual-layer-lab-single-hero-r3.js');
    await import('/@cot-research/visual-layer-lab-layout-fix-r2.js');
    await import('/@cot-research/visual-layer-lab-tools-layout-fix-r2.js');
    await import('/@cot-research/visual-layer-lab-reduced-motion-r9.js');
    await import('/@cot-research/visual-layer-lab-cinematic-camera-r10.js');
    await import('/@cot-research/visual-layer-lab-camera-lock-r11.js');
  }
}
`;

const visualLayerLabPlugin = {
  name: 'cot-research-visual-layer-lab',
  resolveId(id) {
    if (id === bootstrapId) return bootstrapResolvedId;
    return modules.get(id)?.id || null;
  },
  load(id) {
    if (id === bootstrapResolvedId) return bootstrapSource;
    const entry = [...modules.values()].find((item) => item.id === id);
    if (!entry) return null;
    this.addWatchFile(entry.file);
    const source = readFileSync(entry.file, 'utf8');
    if (!entry.capability) return source;
    if (!source.includes(capabilityMarker)) throw new Error('Capability preload marker is missing');
    return source.replace(capabilityMarker, capabilityPreload);
  },
  transformIndexHtml() {
    return [{
      tag: 'script',
      attrs: { type: 'module', src: bootstrapId },
      injectTo: 'body',
    }];
  },
};

export default {
  ...upstreamConfig,
  plugins: [...(upstreamConfig.plugins || []), visualLayerLabPlugin],
};
