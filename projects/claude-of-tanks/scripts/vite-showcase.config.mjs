import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import upstreamConfig from '../upstream/vite.config.js';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const showcaseFile = resolve(projectRoot, 'showcase/capability-showcase.js');
const virtualId = '\0cot-capability-showcase';

const researchShowcasePlugin = {
  name: 'cot-research-capability-showcase',
  resolveId(id) {
    return id === '/@cot-research/capability-showcase.js' ? virtualId : null;
  },
  load(id) {
    if (id !== virtualId) return null;
    this.addWatchFile(showcaseFile);
    return readFileSync(showcaseFile, 'utf8');
  },
  transformIndexHtml() {
    return [{
      tag: 'script',
      attrs: { type: 'module', src: '/@cot-research/capability-showcase.js' },
      injectTo: 'body',
    }];
  },
};

export default {
  ...upstreamConfig,
  plugins: [...(upstreamConfig.plugins || []), researchShowcasePlugin],
};
