import { resolve } from 'node:path';
import { archiveDedicatedCase } from '../server/case-library.ts';

const projectRoot = resolve(process.cwd());
const archived = await archiveDedicatedCase({
  id: 'dedicated-woodblock-adaptive-r46',
  title: '日光木版套印工坊 · 自适应连续工序版',
  note: '同一张 ImageGen 和纸素材贯穿和纸就位、木纹压痕、靛蓝落版、朱红套色与作品完成五个产品状态；状态是同一 Three.js 画布的时间锚点，不对应固定页面。',
  stage: 'refined',
  tags: ['imagegen', 'woodblock', 'adaptive-structure', 'continuous-canvas', 'five-state-process']
}, { ...process.env, SIGNAL_PROJECT_ROOT: projectRoot });

console.log(JSON.stringify(archived, null, 2));
