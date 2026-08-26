import { Client } from '../upstream/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StreamableHTTPClientTransport } from '../upstream/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';

const origin = process.argv[2] ?? 'http://localhost:5199';
const projectId = process.argv[3];
if (!projectId) throw new Error('Usage: node mcp-inspect-project.mjs <origin> <project-id>');

function decode(result) {
  const message = result?.content?.find((entry) => entry.type === 'text')?.text;
  if (result?.isError) throw new Error(message || 'OpenChatCut MCP tool failed.');
  if (result?.structuredContent && typeof result.structuredContent === 'object') return result.structuredContent;
  if (!message) return result;
  try { return JSON.parse(message); } catch { return { text: message }; }
}

function findString(value, names) {
  for (const name of names) if (typeof value?.[name] === 'string') return value[name];
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

const client = new Client({ name: 'openchatcut-project-inspector', version: '0.1.0' });
const transport = new StreamableHTTPClientTransport(new URL('/api/external-mcp/mcp', origin), {
  requestInit: { headers: { Authorization: `Bearer ${mcpToken}`, Origin: origin } },
});
const call = async (name, args = {}) => decode(await client.callTool({ name, arguments: args }));

try {
  await client.connect(transport);
  const binding = await call('target_project', { projectId, editorBaseUrl: origin });
  const session = await call('begin_edit_session', { approvalMode: 'auto' });
  const editSessionId = findString(session, ['editSessionId', 'sessionId']);
  const [project, tracks, markers] = await Promise.all([
    call('read_project', { editSessionId }),
    call('edit_track', { editSessionId, action: 'list' }),
    call('manage_markers', { editSessionId, action: 'list' }),
  ]);
  await call('discard_edit_session', { editSessionId });
  console.log(JSON.stringify({ projectId, binding, project, tracks, markers }, null, 2));
} finally {
  await client.close();
}
