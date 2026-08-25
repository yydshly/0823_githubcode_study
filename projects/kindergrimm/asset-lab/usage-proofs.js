export const USAGE_PROOFS = [
  {
    id: 'narrative',
    title: '叙事对话',
    consumer: '章节故事、任务对话、互动绘本',
    assets: 'Drawn 透明角色 + 道具 PNG + 场景标题与目的',
    value: 'Drawn 轮廓在小尺寸仍清楚；透明角色和道具可直接进入 HTML、Canvas 或游戏对话 UI，不需要把它们重建成 3D。',
    next: '表情状态、对话分支、角色名牌、语音与本地化长度适配。',
    boundary: '这是一个真实的叙事消费界面证明，不是完整对话系统；风格样张只提供美术方向。',
    representation: '2D UI media',
  },
  {
    id: 'collection',
    title: '收藏 / 奖励',
    consumer: '图鉴、奖励结算、角色收藏、商品目录',
    assets: 'Gloss 角色代理图 + 道具 PNG + Seed / Recipe / 来源指纹',
    value: 'Gloss 的塑形轮廓适合收藏陈列；道具 PNG 适合奖励图标；Manifest 让条目可复现、可审查、可版本化。',
    next: '稀有度规则、批量变体、持久化、筛选、解锁状态和真实经济系统。',
    boundary: 'Gloss 卡片展示的是程序化 3D 的 PNG 代理；代理图不替代可旋转模型，也不包含商业交易逻辑。',
    representation: 'catalog proxy + 2D item media',
  },
  {
    id: 'world',
    title: '3D 世界放置',
    consumer: '俯视场景、轻量网页游戏、空间叙事原型',
    assets: 'Voxel 角色几何 + buildPlant 植物几何 + 道具 2D HUD',
    value: '角色与植物以真实 Three.js Group 进入同一相机和尺度环境，可检查轮廓、接地、遮挡、draw calls 与三角面；道具保持适合 HUD 的 2D 表现。',
    next: '导航、碰撞体、交互范围、动画、GLB、LOD、光照预算和移动端真实性能。',
    boundary: '这是最小世界消费证明，不是可玩关卡；道具 HUD 没有被伪造成世界碰撞几何。',
    representation: 'combined procedural Three.js + 2D HUD',
  },
];

export function usageProof(id) {
  return USAGE_PROOFS.find(item => item.id === id) || USAGE_PROOFS[0];
}
