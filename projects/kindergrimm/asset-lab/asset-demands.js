export const DEMAND_STATUSES = {
  'source-ready': { label: '源库可直接生产', tone: 'ready' },
  'generated-ready': { label: '本层确定性生成', tone: 'generated' },
  'extension-needed': { label: '需要能力扩展', tone: 'gap' },
};

export const USAGE_ASSET_DEMANDS = {
  narrative: [
    { id: 'portrait', asset: '角色立绘', consumer: '对话头像 / 叙事主视觉', representation: '2D PNG', source: 'Drawn Renderer', status: 'source-ready', gap: '无', next: '按场景 Seed 批量生成角色主视图。' },
    { id: 'quest-item', asset: '任务道具图标', consumer: '任务目标 / 对话提示', representation: '透明 2D PNG', source: 'Item Generator', status: 'source-ready', gap: '无', next: '复用道具 Recipe 与 provenance。' },
    { id: 'dialogue-layout', asset: '对话界面编排', consumer: '任务对话 UI', representation: 'HTML / CSS', source: 'Asset Lab consumer', status: 'generated-ready', gap: '不是源库素材', next: '保留为产品消费层，不写回源库。' },
    { id: 'expressions', asset: '表情状态组', consumer: '情绪变化 / 对话反馈', representation: '多状态 2D 序列', source: '缺失', status: 'extension-needed', gap: '源库只给出单一角色状态', next: '扩展 Drawn 参数：neutral / alert / sad / joy。' },
    { id: 'story-backdrop', asset: '分层叙事背景', consumer: '镜头景深 / 时间与天气变化', representation: '2D 分层背景', source: '风格样张仅作参考', status: 'extension-needed', gap: '没有可分层的前中后景输出', next: '新增 environment backdrop 输出合同。' },
  ],
  collection: [
    { id: 'figure-proxy', asset: '收藏角色代理图', consumer: '图鉴封面 / 奖励揭示', representation: '2D PNG proxy', source: 'Gloss Renderer', status: 'source-ready', gap: '无', next: '使用相同角色 Recipe 生成统一规格代理图。' },
    { id: 'reward-item', asset: '关联奖励图标', consumer: '奖励条目 / 收藏关联', representation: '透明 2D PNG', source: 'Item Generator', status: 'source-ready', gap: '无', next: '由 Item Recipe 稳定复现。' },
    { id: 'provenance', asset: '来源与复现记录', consumer: '审核 / 版本追踪', representation: 'JSON manifest', source: 'Scene Orchestrator', status: 'generated-ready', gap: '无', next: '接入真实内容库时作为资产元数据保存。' },
    { id: 'rarity-frame', asset: '稀有度与系列框体', consumer: '收藏分类 / 品质识别', representation: 'UI token / 2D frame', source: '缺失', status: 'extension-needed', gap: 'Item rank 尚未映射到收藏视觉系统', next: '建立 rank → frame / color / badge 规则。' },
    { id: 'turntable', asset: '可旋转收藏模型', consumer: '3D 检视 / 展柜', representation: 'rigged or static 3D mesh', source: '缺失', status: 'extension-needed', gap: 'Gloss 是 2D 代理图，不是模型', next: '若产品需要旋转检视，另建 GLB 资产管线。' },
  ],
  world: [
    { id: 'voxel-character', asset: '世界角色', consumer: '场景角色 / 尺度参照', representation: 'procedural 3D geometry', source: 'Voxel Builder', status: 'source-ready', gap: '无', next: '保留 Recipe、pivot、尺度和碰撞合同。' },
    { id: 'plant', asset: '环境植被', consumer: '生态填充 / 构图锚点', representation: 'procedural 3D geometry', source: 'Plant Builder', status: 'source-ready', gap: '无', next: '按性能预算生成变体并复用材质。' },
    { id: 'item-hud', asset: '任务道具提示', consumer: '世界任务 HUD', representation: '2D PNG', source: 'Item Generator', status: 'source-ready', gap: '无', next: '继续作为 UI 媒体，不参与碰撞。' },
    { id: 'world-plan', asset: '场景放置计划', consumer: '世界组合 / 复现', representation: 'JSON placement plan', source: 'Scene Orchestrator', status: 'generated-ready', gap: '当前仅最小放置', next: '后续可扩展 sockets、spawn points 与密度规则。' },
    { id: 'item-model', asset: '可拾取道具模型', consumer: '地面拾取 / 碰撞', representation: 'procedural or imported 3D', source: '缺失', status: 'extension-needed', gap: '当前道具只有 2D 图标', next: '按家族建立少量程序化 3D 原型或导入 GLB。' },
    { id: 'character-motion', asset: '角色动作与骨骼', consumer: '移动 / 交互反馈', representation: 'rig + animation clips', source: '缺失', status: 'extension-needed', gap: 'Voxel Builder 输出静态几何', next: '先定义 idle / walk / interact 的动作合同。' },
  ],
};

export function demandsFor(proofId) {
  return USAGE_ASSET_DEMANDS[proofId] || USAGE_ASSET_DEMANDS.narrative;
}

export function demandCoverage(proofId) {
  const rows = demandsFor(proofId);
  const ready = rows.filter(row => row.status !== 'extension-needed').length;
  return { total: rows.length, ready, gaps: rows.length - ready, percent: Math.round((ready / rows.length) * 100) };
}
