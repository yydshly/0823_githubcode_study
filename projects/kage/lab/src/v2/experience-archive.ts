import { z } from 'zod';

export const experienceArchiveEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2),
  summary: z.string().trim().min(8),
  route: z.string().startsWith('/pages/v2/deliveries/'),
  previewUrl: z.string().startsWith('/creative-assets/v2-experience-archive/'),
  leadCapability: z.string().trim().min(2),
  supportingCapabilities: z.array(z.string().trim().min(2)).min(1).max(4),
  reusableLesson: z.string().trim().min(8),
  status: z.literal('research-reference')
}).strict();

export type ExperienceArchiveEntry = z.infer<typeof experienceArchiveEntrySchema>;

const entries = [
  {
    id: 'weave-light-field',
    title: '经纬光场',
    summary: '在明亮实时 3D 空间中推进梭子，让经纬结构、光线和织物密度共同形成。',
    leadCapability: '实时 3D 材质',
    supportingCapabilities: ['滚动驱动', '结构生成', '明亮空间'],
    reusableLesson: '三维价值来自结构形成过程，而不是把物体放进一个可旋转画布。'
  },
  {
    id: 'ice-core-letters',
    title: '冰芯来信',
    summary: '沿气泡、灰带与花粉层阅读冰芯，把环境证据组织成具有距离感的滚动书信。',
    leadCapability: '生成环境叙事',
    supportingCapabilities: ['滚动编辑', '景深层次', '证据排版'],
    reusableLesson: '意境素材必须与信息层次和阅读节奏共享同一空间逻辑。'
  },
  {
    id: 'forest-sound-route',
    title: '声音藏在哪里',
    summary: '在森林剖面中寻找不同声源，视觉位置、聆听动作和声音结果形成同一条探索路径。',
    leadCapability: '空间声音',
    supportingCapabilities: ['自然环境', '指针探索', '可听反馈'],
    reusableLesson: '声音页面必须让位置、画面和真实可听差异同时改变。'
  },
  {
    id: 'moonlit-tidepool-panorama',
    title: '月光潮池夜巡图卷',
    summary: '一张连续月光海岸全景承载横向夜巡、潮池观察与科普标记。',
    leadCapability: '宽幅生成全景',
    supportingCapabilities: ['横向导航', '环境叙事', '观察标记'],
    reusableLesson: '连续场景比独立卡片更适合建立地点感和旅程方向。'
  },
  {
    id: 'stormglass-archive',
    title: '雷雨余光档案馆',
    summary: '用程序化闪电痕迹和分支状态，把短暂天气变化变成可回看的视觉档案。',
    leadCapability: '程序化 WebGL',
    supportingCapabilities: ['分支路径', '实时光场', '档案叙事'],
    reusableLesson: '程序化效果要留下可理解的状态与证据，而不只是循环播放。'
  },
  {
    id: 'prism-seed-theatre',
    title: '棱镜种子剧场',
    summary: '让一枚种子分散日光，生成视觉负责质感，运行时光谱负责不可替代的变化。',
    leadCapability: '生成视觉 + 运行时增强',
    supportingCapabilities: ['光谱动效', '主题隐喻', '状态过渡'],
    reusableLesson: '关键素材建立身份，代码负责让身份发生静态图无法表达的变化。'
  },
  {
    id: 'sonic-pressing-room',
    title: '声纹压片室',
    summary: '把浏览器合成声音压进透明唱片，低、中、高频分别改变沟槽、折光与边缘振动。',
    leadCapability: '实时音频材质',
    supportingCapabilities: ['WebGL shader', '真实频谱分析', '滚动压片', '能力回退'],
    reusableLesson: '媒介选择必须服从关键职责：当声音要连续改变材质时，静态主图不能代替真实运行时因果。'
  },
  {
    id: 'lighthouse-chart-reveal',
    title: '失踪灯塔海图显影',
    summary: '移动显影灯寻找三枚隐藏印记，让受潮海图上的返航航线重新浮出纸面。',
    leadCapability: 'SVG 蒙版显影',
    supportingCapabilities: ['Canvas 水光', '真实命中', '空间档案', '键盘路径'],
    reusableLesson: '技术手段应服从主题因果：光照到哪里，信息才从同一张纸面出现在哪里。'
  },
  {
    id: 'folded-light-studio',
    title: '折光成形',
    summary: '回收纸纤维灯从折叠到展开，连续状态素材与产品结构共同解释成形过程。',
    leadCapability: '连续产品状态',
    supportingCapabilities: ['生成素材', '材质变化', '直接操控'],
    reusableLesson: '产品变化需要同一主体连续性，不能用无关图片或参数面板冒充。'
  },
  {
    id: 'windborne-letter-valley',
    title: '风把信送过山谷',
    summary: '一张纸从雨后草坡飞向远处暖光山屋，滚动决定距离，指针改变侧风。',
    leadCapability: '生成环境 + 运行时旅程',
    supportingCapabilities: ['宽幅环境素材', '纸张路径', 'Canvas 风场', '情绪行动'],
    reusableLesson: '高质量生成图负责地点与距离，代码必须让主体真正穿过它，而不是把图留作静态背景。'
  },
  {
    id: 'sea-fiber-scope',
    title: '海底光缆听诊台',
    summary: '沿一束透明光缆下潜，故障回波同步改变纤芯形变、脉冲、读数与浏览器合成声音。',
    leadCapability: '主题专属 3D + 声音因果',
    supportingCapabilities: ['连续三维主体', '滚轮听诊', '阶段化声场', '故障回退'],
    reusableLesson: '3D、声音与数据只有共享同一产品状态时才形成体验；技术数量本身不构成质量。'
  },
  {
    id: 'thunderhead-score',
    title: '雷暴气象乐谱',
    summary: '在明亮编辑纸面与局部云体窗口中穿过上升、塔云、电荷与降雨，让滚轮、风切、天气轨迹和程序化声场共同形成。',
    leadCapability: '编辑式空间舞台 + 生成环境 + 声音',
    supportingCapabilities: ['局部素材窗口', '垂直乐谱导航', '滚轮阶段', '指针风切'],
    reusableLesson: '主题不同不等于风格不同；图像版面角色、文字关系与控制轴也必须由当前内容重新决定。'
  }
].map((entry) => experienceArchiveEntrySchema.parse({
  ...entry,
  route: `/pages/v2/deliveries/${entry.id}/`,
  previewUrl: `/creative-assets/v2-experience-archive/${entry.id}.png`,
  status: 'research-reference'
}));

export const V2_EXPERIENCE_ARCHIVE: readonly ExperienceArchiveEntry[] = entries;
