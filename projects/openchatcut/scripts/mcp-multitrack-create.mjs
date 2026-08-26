import { Client } from '../upstream/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StreamableHTTPClientTransport } from '../upstream/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';

const origin = process.argv[2] ?? 'http://localhost:5199';

function decode(result) {
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  if (result?.isError) throw new Error(text || 'OpenChatCut MCP tool failed.');
  if (result?.structuredContent && typeof result.structuredContent === 'object') return result.structuredContent;
  if (!text) return result;
  try { return JSON.parse(text); } catch { return { text }; }
}

function findString(value, names) {
  for (const name of names) if (typeof value?.[name] === 'string' && value[name]) return value[name];
  for (const child of Object.values(value ?? {})) {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      const found = findString(child, names);
      if (found) return found;
    }
  }
}

const response = await fetch(new URL('/api/external-agent/bootstrap', origin), {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: origin,
    'Sec-Fetch-Site': 'none',
    'X-OpenChatCut-Editor-Bootstrap': '1',
  },
  body: '{}',
});
if (!response.ok) throw new Error(`Bootstrap failed: HTTP ${response.status}`);
const { mcpToken } = await response.json();
if (!mcpToken) throw new Error('Bootstrap did not return an MCP token.');

const client = new Client({ name: 'openchatcut-multitrack-create', version: '0.1.0' });
const transport = new StreamableHTTPClientTransport(new URL('/api/external-mcp/mcp', origin), {
  requestInit: { headers: { Authorization: `Bearer ${mcpToken}`, Origin: origin } },
});
const call = async (name, args = {}) => decode(await client.callTool({ name, arguments: args }));

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const created = await call('create_project', {
    name: 'Codex MCP 多轨演示',
    description: '口播主画面、包装层、人声、背景音乐、音效与字幕轨的 Agent 编辑示例。',
    compositionWidth: 1920,
    compositionHeight: 1080,
    fps: 30,
    editorBaseUrl: origin,
  });
  const projectId = findString(created, ['projectId', 'id']);
  if (!projectId) throw new Error(`Cannot find projectId in ${JSON.stringify(created)}`);
  const editorUrl = new URL(`/#/editor/${projectId}`, origin).href;

  await call('target_project', { projectId, editorBaseUrl: origin });
  const session = await call('begin_edit_session', { approvalMode: 'auto' });
  const editSessionId = findString(session, ['editSessionId', 'sessionId']);
  if (!editSessionId) throw new Error(`Cannot find editSessionId in ${JSON.stringify(session)}`);
  const editTrack = (action, options = {}) => call('edit_track', { editSessionId, action, ...options });

  await editTrack('update', { trackId: 'V1', json: JSON.stringify({ name: '主画面' }) });
  await editTrack('create', { json: JSON.stringify({ trackType: 'video', name: '数据包装层' }) });
  await editTrack('create', { json: JSON.stringify({ trackType: 'audio', name: '人声主轨', role: 'anchor' }) });
  await editTrack('create', {
    json: JSON.stringify({ trackType: 'audio', name: '背景音乐', role: 'follower', audioRouting: { duckDepthDb: -12 } }),
  });
  await editTrack('create', { json: JSON.stringify({ trackType: 'audio', name: '音效轨' }) });
  await editTrack('create', { json: JSON.stringify({ trackType: 'caption', name: '中文字幕' }) });
  await call('manage_markers', {
    editSessionId,
    action: 'create',
    markers: [
      { fromFrame: 0, note: '片头：建立主题', color: 'cyan', scope: 'project' },
      { fromFrame: 90, note: '主体：演示产品或讲解观点', color: 'yellow', scope: 'project' },
      { fromFrame: 240, note: '结尾：行动号召', color: 'green', scope: 'project' },
    ],
  });

  const tracks = await editTrack('list');
  const reviewed = await call('review_edit_session', {
    editSessionId,
    summary: 'Create six named tracks, speech/music ducking roles, and three editorial markers.',
  });
  console.log(JSON.stringify({
    projectId,
    editorUrl,
    availableToolCount: tools.length,
    committedStatus: findString(reviewed, ['status']),
    tracks,
  }, null, 2));
} finally {
  await client.close();
}
