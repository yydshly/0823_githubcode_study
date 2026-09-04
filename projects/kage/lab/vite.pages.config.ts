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
        'pages/v2/research/index': resolve(import.meta.dirname, 'pages/v2/research/index.html'),
        'pages/v2/prototypes/scroll-scrub-media/index': resolve(
          import.meta.dirname,
          'pages/v2/prototypes/scroll-scrub-media/index.html',
        ),
        'pages/v2/prototypes/semantic-interaction/index': resolve(
          import.meta.dirname,
          'pages/v2/prototypes/semantic-interaction/index.html',
        ),
        'pages/v2/prototypes/identity-evidence/index': resolve(
          import.meta.dirname,
          'pages/v2/prototypes/identity-evidence/index.html',
        ),
        'pages/v2/prototypes/threeui-liquid-form/index': resolve(
          import.meta.dirname,
          'pages/v2/prototypes/threeui-liquid-form/index.html',
        ),
        'pages/v2/deliveries/dream-record/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/dream-record/index.html',
        ),
        'pages/v2/deliveries/sign-language-season/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/sign-language-season/index.html',
        ),
        'pages/v2/deliveries/thin-film-lab/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/thin-film-lab/index.html',
        ),
        'pages/v2/deliveries/kinetic-score/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/kinetic-score/index.html',
        ),
        'pages/v2/deliveries/wind-kite-lab/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/wind-kite-lab/index.html',
        ),
        'pages/v2/deliveries/after-rain-archive/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/after-rain-archive/index.html',
        ),
        'pages/v2/deliveries/paper-butterfly-garden/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/paper-butterfly-garden/index.html',
        ),
        'pages/v2/deliveries/weave-light-field/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/weave-light-field/index.html',
        ),
        'pages/v2/deliveries/ice-core-letters/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/ice-core-letters/index.html',
        ),
        'pages/v2/deliveries/roof-water-route/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/roof-water-route/index.html',
        ),
        'pages/v2/deliveries/night-reflective-catalog/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/night-reflective-catalog/index.html',
        ),
        'pages/v2/deliveries/color-relay-branching/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/color-relay-branching/index.html',
        ),
        'pages/v2/deliveries/forest-sound-route/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/forest-sound-route/index.html',
        ),
        'pages/v2/deliveries/moonlit-tidepool-panorama/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/moonlit-tidepool-panorama/index.html',
        ),
        'pages/v2/deliveries/stormglass-archive/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/stormglass-archive/index.html',
        ),
        'pages/v2/deliveries/prism-seed-theatre/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/prism-seed-theatre/index.html',
        ),
        'pages/v2/deliveries/aurora-radio-postcard/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/aurora-radio-postcard/index.html',
        ),
        'pages/v2/deliveries/film-camera-repair-paths/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/film-camera-repair-paths/index.html',
        ),
        'pages/v2/deliveries/west-bund-meeting-points/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/west-bund-meeting-points/index.html',
        ),
        'pages/v2/deliveries/fox-gait-observatory/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/fox-gait-observatory/index.html',
        ),
        'pages/v2/deliveries/ten-second-callsign-decode/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/ten-second-callsign-decode/index.html',
        ),
        'pages/v2/deliveries/folded-light-studio/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/folded-light-studio/index.html',
        ),
        'pages/v2/deliveries/same-table-tonight/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/same-table-tonight/index.html',
        ),
        'pages/v2/deliveries/modular-room-sound/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/modular-room-sound/index.html',
        ),
        'pages/v2/deliveries/fridge-tonight/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/fridge-tonight/index.html',
        ),
        'pages/v2/deliveries/eclipse-post-office/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/eclipse-post-office/index.html',
        ),
        'pages/v2/deliveries/thunderhead-score/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/thunderhead-score/index.html',
        ),
        'pages/v2/deliveries/sonic-pressing-room/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/sonic-pressing-room/index.html',
        ),
        'pages/v2/deliveries/sea-fiber-scope/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/sea-fiber-scope/index.html',
        ),
        'pages/v2/deliveries/windborne-letter-valley/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/windborne-letter-valley/index.html',
        ),
        'pages/v2/deliveries/lighthouse-chart-reveal/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/lighthouse-chart-reveal/index.html',
        ),
        'pages/v2/deliveries/kage-creative-director/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/kage-creative-director/index.html',
        ),
        'pages/v2/deliveries/rainlight-walk-recorder/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/rainlight-walk-recorder/index.html',
        ),
        'pages/v2/deliveries/kage-feeling-lens/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/kage-feeling-lens/index.html',
        ),
        'pages/v2/deliveries/kage-opening-rehearsal/index': resolve(
          import.meta.dirname,
          'pages/v2/deliveries/kage-opening-rehearsal/index.html',
        ),
      },
    },
  },
})
