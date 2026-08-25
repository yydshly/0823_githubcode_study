import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalConfig from './vite-visual-layer-lab.config.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const modules = new Map([
  ['/@cot-research/industrial-showroom-config.js', {
    id: '\0cot-industrial-showroom-config',
    file: resolve(projectRoot, 'showcase/industrial-showroom-config.js'),
  }],
  ['/@cot-research/industrial-showroom-asset.js', {
    id: '\0cot-industrial-showroom-asset',
    file: resolve(projectRoot, 'showcase/industrial-showroom-asset.js'),
  }],
  ['/@cot-research/industrial-showroom-entry.js', {
    id: '\0cot-industrial-showroom-entry',
    file: resolve(projectRoot, 'showcase/industrial-showroom-entry.js'),
  }],
]);

const bootstrapId = '/@cot-research/industrial-showroom-bootstrap.js';
const bootstrapResolvedId = '\0cot-industrial-showroom-bootstrap';
const bootstrapSource = `
const params = new URLSearchParams(location.search);
if (
  /^\\/studio\\/?$/.test(location.pathname)
  && params.get('showcase') === 'industrial-showroom'
  && !params.has('lab')
) {
  await import('/@cot-research/industrial-showroom-entry.js');
}
`;

const industrialShowroomPlugin = {
  name: 'cot-research-industrial-showroom',
  resolveId(id) {
    if (id === bootstrapId) return bootstrapResolvedId;
    return modules.get(id)?.id || null;
  },
  load(id) {
    if (id === bootstrapResolvedId) return bootstrapSource;
    const entry = [...modules.values()].find((item) => item.id === id);
    if (!entry) return null;
    this.addWatchFile(entry.file);
    return readFileSync(entry.file, 'utf8');
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
  ...canonicalConfig,
  plugins: [...(canonicalConfig.plugins || []), industrialShowroomPlugin],
};
