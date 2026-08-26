import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const pagesAssetRoot = '/0823_githubcode_study/projects/kage/creative-assets/'
const pagesPublicAssetRoot = '/0823_githubcode_study/projects/kage/assets/'

function rewriteProjectAssetPaths(): Plugin {
  return {
    name: 'rewrite-project-asset-paths',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(css|ts|tsx|js|jsx)$/.test(id)) return null
      const transformed = code.replace(
        /(["'`])\/creative-assets\//g,
        `$1${pagesAssetRoot}`,
      ).replace(
        /(["'`])\/assets\//g,
        `$1${pagesPublicAssetRoot}`,
      )
      return transformed === code ? null : { code: transformed, map: null }
    },
  }
}

export default defineConfig({
  base: '/0823_githubcode_study/projects/kage/',
  plugins: [rewriteProjectAssetPaths()],
  resolve: {
    alias: {
      '@signal-lab/experience-sdk': resolve(import.meta.dirname, 'src/generated-sdk/index.ts'),
    },
  },
  build: {
    target: 'es2022',
    outDir: '.pages-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'workbench': resolve(import.meta.dirname, 'workbench.html'),
        'pages/v1/index': resolve(import.meta.dirname, 'pages/v1/index.html'),
        'pages/v1/case': resolve(import.meta.dirname, 'pages/v1/case.html'),
        'pages/v1/showcase/index': resolve(import.meta.dirname, 'pages/v1/showcase/index.html'),
        'pages/v2/index': resolve(import.meta.dirname, 'pages/v2/index.html'),
      },
    },
  },
})
