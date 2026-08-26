import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const pagesAssetRoot = '/0823_githubcode_study/projects/kage/creative-assets/'

function rewriteArchivedAssetPaths(): Plugin {
  return {
    name: 'rewrite-archived-asset-paths',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/cases/runs/')) return null
      const transformed = code.replace(
        /(["'`])\/creative-assets\//g,
        `$1${pagesAssetRoot}`,
      )
      return transformed === code ? null : { code: transformed, map: null }
    },
  }
}

export default defineConfig({
  base: '/0823_githubcode_study/projects/kage/',
  plugins: [rewriteArchivedAssetPaths()],
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
        'pages/v1/index': resolve(import.meta.dirname, 'pages/v1/index.html'),
        'pages/v1/case': resolve(import.meta.dirname, 'pages/v1/case.html'),
        'pages/v2/index': resolve(import.meta.dirname, 'pages/v2/index.html'),
      },
    },
  },
})
