import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const creativeDirectionSchema = z.object({
  id: safeId,
  title: z.string().min(4),
  category: z.string().min(4),
  status: z.enum(['next-validation', 'planned', 'asset-required']),
  brief: z.string().min(40),
  capabilityIds: z.array(safeId).max(3),
  rendererIntent: z.string().min(4),
  proves: z.string().min(12),
  requiredInput: z.string().min(8),
  avoid: z.string().min(8),
  result: z.object({
    url: z.string().min(4),
    state: z.literal('mechanical-pass'),
    note: z.string().min(8)
  }).strict().optional()
}).strict();

export type CreativeDirection = z.infer<typeof creativeDirectionSchema>;

export const creativeDirectionAtlas: readonly CreativeDirection[] = [
  {
    id: 'daylight-civic-atlas',
    title: '日光公共饮水地图',
    category: 'CIVIC DATA / MAP',
    status: 'next-validation',
    brief: '为城市公共饮水点设计一张明亮的交互导览网页。页面像日光下的市政图册与折叠地图，横向浏览不同街区，选择站点时同步更新水质证据、步行距离和开放状态，最终行动为“找到最近的饮水点”。不要暗色全屏、中央产品、巨型标题、随机粒子或电影式长滚动。',
    capabilityIds: ['semantic-responsive-interaction', 'identity-through-evidence', 'place-grounded-experience'],
    rendererIntent: 'DOM + Canvas 地图',
    proves: '证明系统能从电影式滚动切换到明亮、可选择、信息优先的公共服务网页。',
    requiredInput: '地点决策型页面优先使用带授权与署名的真实地理底图；真实地标经纬度必须与站点、证据和路线共享同一投影。水质与开放状态可使用项目演示数据，但必须显式标注为演示站点，不能暗示为真实公共设施。',
    avoid: '不要把地图做成科技仪表盘；不要用随机线条、抽象曲线、粒子或孤立点位冒充真实地图关系，也不要把演示数据写成真实设施事实。',
    result: {
      url: '/generated-runs/dedicated-c0514ddead80/',
      state: 'mechanical-pass',
      note: '已生成 · 上海徐汇滨江真实地理底图、四个地标关联演示站点、路线与证据已复验 · 待最终视觉确认'
    }
  },
  {
    id: 'kinetic-sports-telemetry',
    title: '城市夜跑数据赛道',
    category: 'KINETIC GRAPHIC / DATA',
    status: 'planned',
    brief: '为城市夜跑社群设计高能量数据网页。使用黑白底与明亮橙红色块，横向穿行不同路段，速度、坡度、心率和环境噪声形成可比较的动态图形，选择路段时路线与数字同步变化，最后行动为“加入下一次夜跑”。不要电影级雾效、中央产品和柔和梦幻光晕。',
    capabilityIds: ['semantic-responsive-interaction'],
    rendererIntent: 'DOM + 2D Canvas',
    proves: '证明系统可以生成饱和、强节奏、数据主导的图形体验，而不是只有安静氛围。',
    requiredInput: '使用项目自有的虚构路线和遥测数据即可完成能力验证。',
    avoid: '不要把数据缩成普通卡片后台，也不要套用暗色电影产品页。'
  },
  {
    id: 'high-key-craft-catalog',
    title: '白色陶瓷标本目录',
    category: 'OBJECT CATALOG / TACTILE',
    status: 'planned',
    brief: '为一组手工白瓷声学器皿设计高调明亮的网页目录。对象像博物馆标本一样分散排列，拖动或触摸选择不同器皿后，表面纹理、声音特征和制作痕迹同步显现；页面以大量留白和小字号注释为主，最后行动为“聆听这一件”。不要暗色背景、巨型标题、连续下滚章节和泛光。',
    capabilityIds: ['semantic-responsive-interaction'],
    rendererIntent: 'DOM + 透明主体 / 可选 Three.js',
    proves: '证明系统能形成高调、留白、对象目录式体验，并让触摸检查承担主要交互。',
    requiredInput: '需要一组光向一致的白瓷主体图；有真实模型时再启用 Three.js 检查。',
    avoid: '没有真实模型时不得伪造精确三维器皿，也不要让留白变成空白。'
  },
  {
    id: 'oral-history-type-field',
    title: '街角口述史字场',
    category: 'TYPOGRAPHY / AUDIO MEMORY',
    status: 'planned',
    brief: '为一组老街居民口述史设计以文字和声音为主的网页。短句沿真实街道方向排布，点击一句话会展开说话者、年份和地点，音频播放时字距与行距产生克制变化，最终形成一张可以保存的社区记忆索引。使用纸白、铅灰和少量印章红，不要全屏环境图、中央 3D 主体或长滚动电影叙事。',
    capabilityIds: ['identity-through-evidence', 'semantic-responsive-interaction'],
    rendererIntent: '语义 DOM + Web Audio',
    proves: '证明项目能让字体、声音和证据关系成为主视觉，Three.js 不再是固定依赖。',
    requiredInput: '测试阶段可使用自有短句和静音占位；发布必须取得真实音频授权。',
    avoid: '不要用波形和漂浮文字冒充口述证据，也不要牺牲可读性。'
  },
  {
    id: 'precision-machine-anatomy',
    title: '精密机械解剖桌',
    category: 'REAL 3D / INSPECTION',
    status: 'asset-required',
    brief: '为一件精密机械计时装置设计可检查的产品网页。明亮工作台上始终保持同一台装置，拖动旋转观察，选择部件后执行有限拆解并显示材质、连接和功能证据，最终回到完整组装状态。不要用程序化几何伪造真实零件，不要自动无限旋转，不要紫色科技风。',
    capabilityIds: [],
    rendererIntent: 'DOM + 真实 GLB / Three.js',
    proves: '验证真实模型加载、部件层级、检查相机和证据标注是否能进入生成主闭环。',
    requiredInput: '必须提供具有可用部件层级和材质的真实 GLB；没有资产时阻断生成。',
    avoid: '不要把模型查看器包装成完成的产品故事，也不要承诺不存在的拆解结构。'
  },
  {
    id: 'playful-botany-lab',
    title: '儿童植物观察桌',
    category: 'PLAYFUL LEARNING / SPATIAL',
    status: 'planned',
    brief: '为儿童自然教育设计明亮、有触感的植物观察网页。叶片、种子和根系像桌面教具一样分区排列，拖动放大镜会显示叶脉、含水量和生长阶段，选择不同标本时观察任务与图形反馈同步变化，最后行动为“开始一次观察”。使用绿色、柠檬黄与纸张白，不要暗色电影感、巨型品牌标题和无意义粒子。',
    capabilityIds: ['semantic-responsive-interaction'],
    rendererIntent: 'DOM + Canvas / 轻量 Three.js',
    proves: '证明项目可以生成明亮、友好、任务驱动的学习体验，而非只面向高冷品牌展示。',
    requiredInput: '可先使用项目自有程序化叶片和标本插图，真实课程内容需后续审核。',
    avoid: '不要把儿童设计等同于堆叠卡通装饰，也不要弱化任务与知识反馈。'
  }
].map((direction) => creativeDirectionSchema.parse(direction));
