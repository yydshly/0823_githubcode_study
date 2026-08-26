import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { creativeApiPlugin } from './server/creative-api-plugin.ts';

const DEFAULT_CODEX_CREATIVE_MODEL = 'gpt-5.6-sol';

function sandboxedGeneratedModuleCors(): Plugin {
  const allowedPrefixes = ['/generated/runs/', '/cases/runs/', '/src/generated-sdk/', '/node_modules/.vite/deps/', '/creative-assets/'];
  return {
    name: 'signal-lab-sandboxed-generated-module-cors',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?', 1)[0] || '';
        if (request.headers.origin === 'null' && allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
          response.setHeader('Access-Control-Allow-Origin', 'null');
          response.setHeader('Vary', 'Origin');
        }
        next();
      });
    }
  };
}

function workbenchEnhancementEntries(): Plugin {
  return {
    name: 'signal-lab-workbench-enhancement-entries',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (!context.path.endsWith('/workbench.html')) return html;
        return {
          html,
          tags: [
            { tag: 'script', attrs: { type: 'module', src: '/src/workbench-direct-code.ts' }, injectTo: 'body' }
          ]
        };
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const environment = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    base: './',
    resolve: {
      alias: {
        '@signal-lab/experience-sdk': fileURLToPath(new URL('./src/generated-sdk/index.ts', import.meta.url))
      }
    },
    plugins: [
      sandboxedGeneratedModuleCors(),
      workbenchEnhancementEntries(),
      creativeApiPlugin({
        ...environment,
        CODEX_CREATIVE_MODEL: environment.CODEX_CREATIVE_MODEL || DEFAULT_CODEX_CREATIVE_MODEL,
        SIGNAL_PROJECT_ROOT: process.cwd()
      })
    ],
    build: {
      target: 'es2022',
      sourcemap: true,
      rolldownOptions: {
        input: {
          experience: 'index.html',
          workbench: 'workbench.html',
          cases: 'cases.html'
        }
      }
    }
  };
});
