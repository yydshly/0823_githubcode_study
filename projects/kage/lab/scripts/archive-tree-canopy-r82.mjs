import { resolve } from 'node:path';
import { archiveDedicatedCase } from '../server/case-library.ts';

const projectRoot = resolve(process.cwd());
const archived = await archiveDedicatedCase({
  id: 'dedicated-tree-canopy-final-r82',
  title: '树冠降温观察站 · 真实环境联动最终版',
  note: '真实街道树冠素材承担主体识别，Three.js 只叠加树荫、热场与补水反馈；自动演示、真实滚轮和直接控件共享同一状态。桌面与 390px 移动端浏览器验收通过。',
  stage: 'refined',
  tags: ['真实环境素材', 'Three.js', '滚轮联动', '直接控件', '移动端', '最终效果'],
  presentation: {
    assetUrl: '/creative-assets/r82-tree-canopy/street-canopy-hero-v1.png',
    kind: 'environment',
    fit: 'cover',
    position: '56% 50%',
    opacity: 0.96,
    tone: 'linear-gradient(135deg, #172418 0%, #5e744e 55%, #d9cead 100%)',
  },
}, { ...process.env, SIGNAL_PROJECT_ROOT: projectRoot });

console.log(JSON.stringify(archived, null, 2));
