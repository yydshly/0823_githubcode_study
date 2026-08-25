import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalConfig from './vite-visual-layer-lab.config.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const entries = new Map([
  ['/@cot-research/research-platform.js', {
    id: '\0cot-research-platform',
    file: resolve(projectRoot, 'showcase/research-platform.js'),
  }],
  ['/@cot-research/research-platform.css', {
    id: '\0cot-research-platform.css',
    file: resolve(projectRoot, 'showcase/research-platform.css'),
  }],
  ['/@cot-research/research-platform-registry.js', {
    id: '\0cot-research-platform-registry',
    file: resolve(projectRoot, 'showcase/research-platform-registry.js'),
  }],
  ['/@cot-research/research-archive.js', {
    id: '\0cot-research-archive',
    file: resolve(projectRoot, 'showcase/research-archive.js'),
  }],
  ['/@cot-research/research-archive.css', {
    id: '\0cot-research-archive.css',
    file: resolve(projectRoot, 'showcase/research-archive.css'),
  }],
  ['/@cot-research/product-workbench.js', {
    id: '\0cot-product-workbench',
    file: resolve(projectRoot, 'showcase/product-workbench-v2.js'),
  }],
  ['/@cot-research/product-workbench.css', {
    id: '\0cot-product-workbench.css',
    file: resolve(projectRoot, 'showcase/product-workbench.css'),
  }],
  ['/@cot-research/neutral-inspection-scene.js', {
    id: '\0cot-neutral-inspection-scene',
    file: resolve(projectRoot, 'showcase/neutral-inspection-scene.js'),
  }],
  ['/@cot-research/industrial-showroom-config.js', {
    id: '\0cot-industrial-showroom-config',
    file: resolve(projectRoot, 'showcase/industrial-showroom-config.js'),
  }],
  ['/@cot-research/industrial-showroom-asset.js', {
    id: '\0cot-industrial-showroom-asset',
    file: resolve(projectRoot, 'showcase/industrial-showroom-asset.js'),
  }],
  ['/@cot-research/nova-field-node-asset.js', {
    id: '\0cot-nova-field-node-asset',
    file: resolve(projectRoot, 'showcase/nova-field-node-asset.js'),
  }],
  ['/@cot-research/product-subject-adapter.js', {
    id: '\0cot-product-subject-adapter',
    file: resolve(projectRoot, 'showcase/product-subject-adapter.js'),
  }],
  ['/@cot-research/product-subject-registry.js', {
    id: '\0cot-product-subject-registry',
    file: resolve(projectRoot, 'showcase/product-subject-registry.js'),
  }],
]);
const hubHtml = resolve(projectRoot, 'showcase/research-platform.html');
const archiveHtml = resolve(projectRoot, 'showcase/research-archive.html');
const workbenchHtml = resolve(projectRoot, 'showcase/product-workbench.html');

const researchPlatformPlugin = {
  name: 'cot-research-platform',
  resolveId(id) {
    return entries.get(id)?.id || null;
  },
  load(id) {
    const entry = [...entries.values()].find((candidate) => candidate.id === id);
    if (!entry) return null;
    this.addWatchFile(entry.file);
    return readFileSync(entry.file, 'utf8');
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        const requestUrl = new URL(req.url || '/', 'http://research.local');
        const htmlFile = requestUrl.pathname === '/research' || requestUrl.pathname === '/research/'
          ? hubHtml
          : requestUrl.pathname === '/research/archive' || requestUrl.pathname === '/research/archive/'
            ? archiveHtml
            : requestUrl.pathname === '/workbench' || requestUrl.pathname === '/workbench/'
              ? workbenchHtml
              : null;
        if (!htmlFile) {
          next();
          return;
        }
        const source = readFileSync(htmlFile, 'utf8');
        const html = await server.transformIndexHtml(requestUrl.pathname, source);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
};

export default {
  ...canonicalConfig,
  plugins: [...(canonicalConfig.plugins || []), researchPlatformPlugin],
};
