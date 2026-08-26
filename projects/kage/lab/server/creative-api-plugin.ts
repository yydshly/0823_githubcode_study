import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { ZodError } from 'zod';
import type { CreativeBrief, CreativeProviderId } from '../src/generation/schema.ts';
import { assetProductionRequestSchema } from '../src/generation/asset-production.ts';
import { generateAssets, importUserAsset, readGeneratedAsset } from './asset-generator.ts';
import { generateDedicatedExperience, readDedicatedRun, refineDedicatedExperience, reviseDedicatedExperience } from './dedicated-code-service.ts';
import { archiveDedicatedCase, listCases, readCaseRun } from './case-library.ts';
import { createGenerationJob, readGenerationJob, updateGenerationJob } from './generation-job-store.ts';
import { ensureGenerationJobRunning } from './generation-job-runner.ts';
import { interpretWithProvider, providerStatus } from './provider-service.ts';

const maxBodyBytes = 16_384;
const maxAssetBodyBytes = 98_304;
const maxUserAssetBodyBytes = 28_000_000;
const maxDedicatedBodyBytes = 65_536;

export function creativeApiPlugin(environment: Readonly<Record<string, string | undefined>> = process.env): Plugin {
  const middleware = async (request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> => {
    const url = new URL(request.url || '/', 'http://creative.local');
    if (request.method === 'GET' && url.pathname.startsWith('/generated-runs/')) {
      const id = url.pathname.split('/').filter(Boolean)[1] || '';
      const run = await readDedicatedRun(id, environment);
      if (!run) { sendHtml(response, 404, generatedNotFound()); return; }
      sendHtml(response, 200, generatedPage(run.entryUrl, run.cssUrl, run.title, url.searchParams.get('embed') === '1'));
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/cases/') && !url.pathname.startsWith('/cases/runs/')) {
      const id = url.pathname.split('/').filter(Boolean)[1] || '';
      const run = await readCaseRun(id, environment);
      if (!run) { sendHtml(response, 404, generatedNotFound()); return; }
      sendHtml(response, 200, generatedPage(run.entryUrl, run.cssUrl, run.title, url.searchParams.get('embed') === '1'));
      return;
    }
    if (!url.pathname.startsWith('/api/creative/')) { next(); return; }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      if (request.method === 'GET' && url.pathname.startsWith('/api/creative/assets/')) {
        const id = url.pathname.slice('/api/creative/assets/'.length);
        const asset = await readGeneratedAsset(id, environment);
        if (!asset) { send(response, 404, { error: 'Generated asset not found.' }); return; }
        response.statusCode = 200;
        response.setHeader('Content-Type', asset.contentType);
        response.setHeader('Content-Length', asset.bytes.byteLength);
        response.end(asset.bytes);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/creative/providers') {
        send(response, 200, await providerStatus(environment));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/creative/cases') {
        send(response, 200, { cases: await listCases(environment) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/jobs') {
        const job = await createGenerationJob(await readBody(request), environment);
        void ensureGenerationJobRunning(job.id, { ...environment, SIGNAL_PREVIEW_ORIGIN: readLocalPreviewOrigin(request) });
        send(response, 201, { job });
        return;
      }
      if (url.pathname.startsWith('/api/creative/jobs/')) {
        const id = url.pathname.slice('/api/creative/jobs/'.length);
        if (request.method === 'GET') {
          const job = await readGenerationJob(id, environment);
          if (!job) { send(response, 404, { error: '生成任务不存在。' }); return; }
          if (job.status === 'running') void ensureGenerationJobRunning(job.id, { ...environment, SIGNAL_PREVIEW_ORIGIN: readLocalPreviewOrigin(request) });
          send(response, 200, { job });
          return;
        }
        if (request.method === 'PATCH') {
          send(response, 200, { job: await updateGenerationJob(id, await readBody(request), environment) });
          return;
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/cases/archive') {
        send(response, 200, { entry: await archiveDedicatedCase(await readBody(request, maxDedicatedBodyBytes), environment) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/interpret') {
        const body = await readBody(request) as { brief?: CreativeBrief; provider?: CreativeProviderId; jobId?: string };
        const provider = readProvider(body.provider);
        const brief = readBrief(body.brief);
        const jobId = readJobId(body.jobId);
        try {
          if (jobId) await updateGenerationJob(jobId, { stage: 'planning', message: '正在调用模型理解目标、页面结构和视觉方向。' }, environment);
          const interpretation = await interpretWithProvider(brief, provider, environment);
          if (jobId) await updateGenerationJob(jobId, {
            stage: 'assets',
            message: '模型规划完成，正在判断素材来源与诚实回退路径。',
            model: interpretation.provenance.model
          }, environment);
          send(response, 200, { interpretation });
        } catch (error) {
          if (jobId) await failJob(jobId, 'planning', error, environment);
          throw error;
        }
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/assets/generate') {
        const body = assetProductionRequestSchema.parse(await readBody(request, maxAssetBodyBytes));
        const report = await generateAssets(body, environment);
        send(response, 200, { report });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/assets/import') {
        const asset = await importUserAsset(await readBody(request, maxUserAssetBodyBytes), environment);
        send(response, 200, { asset });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/code/generate') {
        const body = await readBody(request, maxDedicatedBodyBytes) as Record<string, unknown>;
        const jobId = readJobId(body.jobId);
        const { jobId: _jobId, ...input } = body;
        try {
          if (jobId) await updateGenerationJob(jobId, { stage: 'authoring', message: 'Codex 正在编写本次目标专属的 Three.js 与 DOM 页面代码。' }, environment);
          const receipt = await generateDedicatedExperience(input, environment);
          if (jobId) await updateGenerationJob(jobId, {
            stage: 'reviewing',
            message: '专属代码已编译，正在准备四个真实浏览器状态的视觉评审。',
            sourceRunId: receipt.id,
            sourceReceipt: receipt,
            model: receipt.model
          }, environment);
          send(response, 200, { receipt });
        } catch (error) {
          if (jobId) await failJob(jobId, 'authoring', error, environment);
          throw error;
        }
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/code/revise') {
        const result = await reviseDedicatedExperience(await readBody(request, maxDedicatedBodyBytes), environment);
        send(response, 200, { result });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/creative/code/refine') {
        const previewOrigin = readLocalPreviewOrigin(request);
        const body = await readBody(request, maxDedicatedBodyBytes) as Record<string, unknown>;
        const jobId = readJobId(body.jobId);
        const { jobId: _jobId, ...input } = body;
        try {
          if (jobId) await updateGenerationJob(jobId, { stage: 'refining', message: '正在采集首屏、中段、末段和移动端，并由视觉模型选择最佳版本。' }, environment);
          const result = await refineDedicatedExperience(input, { ...environment, SIGNAL_PREVIEW_ORIGIN: previewOrigin });
          if (jobId) await updateGenerationJob(jobId, {
            stage: 'complete',
            message: result.status === 'refined' ? '视觉精修完成，已选中新的最终最佳版本。' : result.status === 'kept' ? '视觉评审完成，当前版本即为最终最佳版本。' : '修订候选未通过门禁，已回退并选中原始最佳版本。',
            sourceRunId: result.parentId,
            bestRunId: result.receipt.id,
            bestPreviewUrl: result.receipt.previewUrl,
            bestReceipt: result.receipt,
            decision: result.status,
            sourceScore: result.sourceAssessment.score,
            finalScore: result.finalAssessment.score,
            model: result.receipt.model
          }, environment);
          send(response, 200, { result });
        } catch (error) {
          if (jobId) await failJob(jobId, 'reviewing', error, environment);
          throw error;
        }
        return;
      }
      send(response, 404, { error: 'Unknown creative API route.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const clientError = error instanceof ZodError || message.includes('请求体') || message.includes('brief') || message.includes('至少描述') || message.includes('素材') || message.includes('文件');
      send(response, clientError ? 400 : 503, { error: message });
    }
  };
  return {
    name: 'signal-lab-creative-api',
    configureServer(server) { server.middlewares.use((request, response, next) => { void middleware(request, response, next); }); },
    configurePreviewServer(server) { server.middlewares.use((request, response, next) => { void middleware(request, response, next); }); }
  };
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, status: number, html: string): void {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'none'; worker-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
  response.end(html);
}

async function readBody(request: IncomingMessage, limit = maxBodyBytes): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > limit) throw new Error(`请求体超过 ${Math.round(limit / 1024)} KB。`);
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('请求体必须是有效 JSON。'); }
}

function readBrief(value: CreativeBrief | undefined): CreativeBrief {
  if (!value || typeof value.text !== 'string') throw new Error('brief.text 缺失。');
  return { text: value.text.slice(0, 600), seed: Number.isSafeInteger(value.seed) ? value.seed : undefined };
}

function readProvider(value: CreativeProviderId | undefined): CreativeProviderId {
  return value === 'auto' || value === 'codex' || value === 'mimo' || value === 'minimax' || value === 'openai' || value === 'local' ? value : 'auto';
}

function readJobId(value: unknown): string | null {
  return typeof value === 'string' && /^job-[a-f0-9]{16}$/.test(value) ? value : null;
}

async function failJob(
  jobId: string,
  retryableStage: 'planning' | 'authoring' | 'reviewing',
  error: unknown,
  environment: Readonly<Record<string, string | undefined>>
): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 1200);
  await updateGenerationJob(jobId, {
    stage: 'failed',
    message: `阶段执行失败，可从 ${retryableStage} 重试。`,
    error: message,
    retryableStage
  }, environment).catch(() => undefined);
}

function readLocalPreviewOrigin(request: IncomingMessage): string {
  const host = request.headers.host?.trim() || '127.0.0.1:8143';
  let parsed: URL;
  try { parsed = new URL(`http://${host}`); } catch { throw new Error('无效的本地预览地址。'); }
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost' && parsed.hostname !== '[::1]') {
    throw new Error('视觉精修只允许访问本地预览服务。');
  }
  parsed.pathname = '/';
  parsed.search = '';
  return parsed.origin;
}

function generatedPage(entryUrl: string, cssUrl: string, title: string, embed: boolean): string {
  const safeTitle = escapeHtml(title);
  const safeEntry = escapeAttribute(entryUrl);
  const safeCss = escapeAttribute(cssUrl);
  const embedAttribute = embed ? 'true' : 'false';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${safeTitle}</title><link rel="stylesheet" href="${safeCss}"><style>body[data-signal-embed="true"]{overflow-x:hidden}body[data-signal-embed="true"] #app h1{width:min(100%,18ch)!important;max-width:88vw!important;font-size:clamp(2.6rem,6vw,5.5rem)!important;line-height:.94!important;overflow-wrap:anywhere;text-wrap:balance}@media(max-width:600px){body[data-signal-embed="true"] #app h1{font-size:clamp(2.25rem,10vw,4rem)!important;max-width:92vw!important}}</style></head><body data-signal-embed="${embedAttribute}"><main id="app"><section class="generated-loading"><strong>正在启动专属体验</strong><p>语义内容与 Three.js 场景正在挂载。</p></section></main><script type="module" src="${safeEntry}"></script></body></html>`;
}

function generatedNotFound(): string {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>生成结果不存在</title></head><body><main><h1>生成结果不存在</h1><p>它可能尚未编译完成，或已从本地生成目录移除。</p></main></body></html>';
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
