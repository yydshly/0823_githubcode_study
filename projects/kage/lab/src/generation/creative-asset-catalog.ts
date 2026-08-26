export interface ProjectCreativeAsset {
  id: string;
  uri: string;
  bundlePath: string;
  kind: 'image' | 'texture' | 'environment' | 'model-3d' | 'audio' | 'video' | 'font';
  source: 'chatgpt-generated' | 'model-generated' | 'user-provided' | 'licensed';
  role: string;
  description: string;
  payloadBytes: number;
  tags: readonly string[];
  required?: boolean;
  exclusiveWhenMatched?: boolean;
  companionFor?: readonly string[];
  experience?: {
    anchor: number;
    function: 'establish' | 'develop' | 'transform' | 'resolve' | 'persistent';
    visualState: string;
    continuity: string;
    integration: 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | 'native-media';
  };
}

const catalog: readonly ProjectCreativeAsset[] = [
  {
    id: 'rain-window-environment-v1',
    uri: '/creative-assets/rain-window-environment-v1.png',
    bundlePath: 'assets/rain-window-environment-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'full-bleed rainy dawn window environment for the tabletop rain recorder',
    description: '清晨 06:18 的真实雨窗与低调桌面环境；负责把雨声记录器放入可信空间，并为左右移动的文案和产品同时保留负空间。',
    payloadBytes: 2_194_993,
    tags: ['晨雨', '雨声', '收集雨声', '桌面声学器物', '桌面产品', '声音记录器', '窗边', '露水', 'rain recorder', 'rain sound'],
    required: true,
    companionFor: ['rain-memory-recorder-v1'],
    experience: {
      anchor: .08,
      function: 'establish',
      visualState: '全屏雨窗、凝露玻璃与暗色桌面形成真实清晨空间，产品主体在其中自然落地而不是悬浮贴图。',
      continuity: '雨窗机位、桌面水平线和蓝灰晨光贯穿全过程，只允许雨势、焦点和暖色反射随滚动变化。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'rain-memory-recorder-v1',
    uri: '/creative-assets/rain-memory-recorder-v1.png',
    bundlePath: 'assets/rain-memory-recorder-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    role: 'persistent tabletop rain-sound recorder hero',
    description: '带真实 Alpha 的桌面雨声记录器：陶瓷底座、拉丝铝结构、凝露透明声学膜、共振腔、实体录音旋钮和克制暖色状态灯。必须作为同一个主体贯穿接收雨声、内部共振和保存声音三个滚动阶段，不能拆成不相关零件或替换为乐器。',
    payloadBytes: 2_211_139,
    tags: ['晨雨', '雨声', '收集雨声', '桌面声学器物', '桌面产品', '声音记录器', '记录声音', '窗边', '露水', '保存这一刻的声音', 'rain recorder', 'rain sound'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .5,
      function: 'persistent',
      visualState: '同一台完整桌面雨声记录器始终可辨认；只允许凝露、膜片振动、共振光和记录状态随滚动变化。',
      continuity: '陶瓷底座、雨滴轮廓、旋钮、透明膜和暖色指示灯在开场、中段与结尾保持完全一致。',
      integration: 'alpha-subject'
    }
  },
  {
    id: 'acoustic-resonance-instrument-v1',
    uri: '/creative-assets/acoustic-resonance-instrument-v1.png',
    bundlePath: 'assets/acoustic-resonance-instrument-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    role: 'transparent acoustic product hero',
    description: '带真实 Alpha 的冷银声学设备主体，包含共振核心、透明声学膜和精密控制结构；适合作为声音产品首屏锚点、深度分层与滚动拆解主体。',
    payloadBytes: 2_143_595,
    tags: ['智能声音', '声音产品', '声音', '声学', '音频', '独立创作者', '创作者', '未来感', 'acoustic', 'audio', 'sound']
  },
  {
    id: 'fashion-fluid-couture-v1',
    uri: '/creative-assets/fashion-fluid-couture-v1.png',
    bundlePath: 'assets/fashion-fluid-couture-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    role: 'hero material anchor',
    description: '紫黑空间中的半透明液态玻璃与欧根纱高定轮廓；适合作为时装首屏主体、纹理和景深锚点。',
    payloadBytes: 1_851_938,
    tags: ['先锋时装', '时装', '服装', '流体', '光幕', '梦幻', '编辑感', '年轻创意', 'fashion', 'couture', 'fluid']
  },
  {
    id: 'fashion-fluid-couture-cutout-v2',
    uri: '/creative-assets/fashion-fluid-couture-cutout-v2.png',
    bundlePath: 'assets/fashion-fluid-couture-cutout-v2.png',
    kind: 'image',
    source: 'chatgpt-generated',
    role: 'transparent hero subject',
    description: '带真实 Alpha 的紫蓝液态欧根纱高定雕塑；适合作为 Three.js 前景主体、顶点形变和粒子解构锚点。',
    payloadBytes: 2_277_176,
    tags: ['先锋时装', '时装', '服装', '流体', '光幕', '梦幻', '编辑感', '年轻创意', '透明主体', 'fashion', 'couture', 'fluid']
  },
  {
    id: 'biomaterial-night-greenhouse-v1',
    uri: '/creative-assets/biomaterial-night-greenhouse-v1.png',
    bundlePath: 'assets/biomaterial-night-greenhouse-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'full-bleed nocturnal greenhouse environment and biomaterial seed anchor',
    description: '宽幅夜间生物材料温室，包含悬浮半透明种子主体、温室结构、湿润暗场和连续边缘；用于全屏环境融合、景深分层与滚动表皮形成。',
    payloadBytes: 2_041_016,
    tags: ['生物材料', '温室', '夜间', '种子', '纤维', '建筑表皮', '建筑师', '材料研究', '预约参观', 'biomaterial', 'greenhouse', 'seed']
  },
  {
    id: 'biomaterial-seed-pod-plate-v1',
    uri: '/creative-assets/biomaterial-seed-pod-plate-v1.png',
    bundlePath: 'assets/biomaterial-seed-pod-plate-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    role: 'opening biomaterial seed subject',
    description: '发光纤维种荚主体，负责体验开场的单一视觉焦点，并为后续纤维扩展保留轮廓与光色连续性。',
    payloadBytes: 1_778_131,
    tags: ['生物材料', '温室', '夜间', '种子', '纤维', '建筑表皮', '建筑师', '材料研究', '预约参观', 'biomaterial', 'greenhouse', 'seed'],
    required: true,
    experience: {
      anchor: .06,
      function: 'establish',
      visualState: '完整发光种荚在暗场中成为唯一可识别主体。',
      continuity: '种荚内部金色纤维和蓝灰膜层将延续到中段的结构生长。',
      integration: 'alpha-subject'
    }
  },
  {
    id: 'biomaterial-fiber-transition-v1',
    uri: '/creative-assets/biomaterial-fiber-transition-v1.png',
    bundlePath: 'assets/biomaterial-fiber-transition-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'mid-experience fiber-to-architecture transition',
    description: '种荚纤维向空间骨架扩散的宽幅过渡环境，负责中段结构变化，而不是装饰性贴图。',
    payloadBytes: 2_062_096,
    tags: ['生物材料', '温室', '夜间', '种子', '纤维', '建筑表皮', '建筑师', '材料研究', '预约参观', 'biomaterial', 'greenhouse', 'seed'],
    required: true,
    experience: {
      anchor: .5,
      function: 'transform',
      visualState: '种荚纤维突破主体边界并形成可辨认的建筑骨架。',
      continuity: '保留开场的蓝灰膜层和金色纤维，同时把方向引向最终温室结构。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'biomaterial-mature-greenhouse-v1',
    uri: '/creative-assets/biomaterial-mature-greenhouse-v1.png',
    bundlePath: 'assets/biomaterial-mature-greenhouse-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'final mature greenhouse environment',
    description: '成熟夜间温室环境，负责最终空间收束、尺度证明与预约参观行动画面。',
    payloadBytes: 2_173_137,
    tags: ['生物材料', '温室', '夜间', '种子', '纤维', '建筑表皮', '建筑师', '材料研究', '预约参观', 'biomaterial', 'greenhouse', 'seed'],
    required: true,
    experience: {
      anchor: .94,
      function: 'resolve',
      visualState: '成熟温室占据完整空间，结构、湿润空气和灯光形成最终英雄画面。',
      continuity: '让中段生成的纤维骨架自然落定为可进入的温室，并为 CTA 留出稳定阅读区。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'observatory-cloud-approach-v1',
    uri: '/creative-assets/observatory-approach-v1.png',
    bundlePath: 'assets/observatory-approach-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'opening cloud-sea approach to the floating observatory',
    description: '蓝色黎明云海中的漂浮天文观测站外景，负责建立建筑身份、尺度、接近方向和安静电影感。',
    payloadBytes: 1_703_570,
    tags: ['漂浮', '云层', '云海', '未来天文', '天文观测站', '观测站', 'observatory', 'cloud'],
    required: true,
    experience: {
      anchor: .08,
      function: 'establish',
      visualState: '从云海上方接近同一座白色圆形观测站，玻璃穹顶与引桥构成清晰空间目标。',
      continuity: '白色陶瓷、拉丝铝、分段玻璃穹顶、蓝色黎明和克制暖光必须延续到内部镜头。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'observatory-dome-interior-v1',
    uri: '/creative-assets/observatory-dome-interior-v1.png',
    bundlePath: 'assets/observatory-dome-interior-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'mid-scroll entry into the transparent observatory dome',
    description: '同一观测站的玻璃穹顶内部与大型机械望远镜，负责把滚动从外部接近转化为空间进入。',
    payloadBytes: 2_192_998,
    tags: ['漂浮', '云层', '云海', '未来天文', '天文观测站', '观测站', '透明穹顶', '穹顶', '望远镜', 'observatory', 'dome'],
    required: true,
    experience: {
      anchor: .5,
      function: 'transform',
      visualState: '镜头穿过玻璃穹顶边缘并进入内部，望远镜、湿润玻璃、反射地面和远处云海形成真实景深。',
      continuity: '保留外景的建筑材料、日出方向与暖色实用灯，同时将视觉锚点收束到望远镜。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'observatory-star-atlas-v1',
    uri: '/creative-assets/observatory-star-atlas-v1.png',
    bundlePath: 'assets/observatory-star-atlas-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'final spatial star-atlas reveal anchored to the telescope',
    description: '同一穹顶内部的最终星图状态，科学星点、轨道与坐标场从望远镜延展到完整空间，负责情绪高潮与结尾兑现。',
    payloadBytes: 2_647_208,
    tags: ['漂浮', '云层', '未来天文', '天文观测站', '观测站', '透明穹顶', '星图', '空间展开', 'observatory', 'star atlas'],
    required: true,
    experience: {
      anchor: .92,
      function: 'resolve',
      visualState: '由望远镜锚定的三维星图填满穹顶，星点、轨道和坐标层从前景贯穿到天空。',
      continuity: '保持同一望远镜、穹顶结构和暖色地面反射，只让环境从蓝色黎明自然加深为克制夜色。',
      integration: 'seamless-field'
    }
  },
  {
    id: 'dream-room-awakening-v1',
    uri: '/creative-assets/dream-room-awakening-v1.png',
    bundlePath: 'assets/dream-room-awakening-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'opening just-awakened bedroom environment',
    description: '同一间真实卧室的朦胧清晨开场：未整理的床、薄纱窗帘和克制自然光共同建立刚醒来的身体感，而不是科技化梦境符号。',
    payloadBytes: 1_648_240,
    tags: ['记录梦境', '梦境', '梦', '刚刚醒来', '模糊房间', '记忆碎片', '可探索空间', '记录今晚的梦', 'dream', 'journal'],
    required: true,
    experience: {
      anchor: .06,
      function: 'establish',
      visualState: '床沿视角中的房间仍然轻微失焦，窗光、床单和家具只形成安静而可信的轮廓。',
      continuity: '固定房间、镜头、左侧窗帘、床、椅子、床头柜与蓝灰晨光，后续只改变记忆层的显现程度。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'dream-memory-fragments-v1',
    uri: '/creative-assets/dream-memory-fragments-v1.png',
    bundlePath: 'assets/dream-memory-fragments-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'mid-scroll explorable memory-space transition',
    description: '同一卧室在连续窗纱、反射与景深中展开多层记忆路径；没有卡片边框或拼贴框感，用于滚动时把房间变成可探索空间。',
    payloadBytes: 1_509_494,
    tags: ['记录梦境', '梦境', '梦', '刚刚醒来', '模糊房间', '记忆碎片', '可探索空间', '记录今晚的梦', 'dream', 'journal'],
    required: true,
    experience: {
      anchor: .52,
      function: 'transform',
      visualState: '房间结构保持可辨认，但窗纱、微弱倒影和走廊般的空间回声在前中后景之间展开。',
      continuity: '沿用开场的相机、家具、床品与自然光方向，让记忆空间从真实环境内部生长，而不是切换到另一张插画。',
      integration: 'seamless-field'
    }
  },
  {
    id: 'dream-night-record-v1',
    uri: '/creative-assets/dream-night-record-v1.png',
    bundlePath: 'assets/dream-night-record-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'final quiet recording-place resolution',
    description: '记忆层收束回同一卧室，床头柜上的空白记录本被自然晨光轻轻照亮，为“记录今晚的梦”提供真实、克制的最终行动锚点。',
    payloadBytes: 1_731_294,
    tags: ['记录梦境', '梦境', '梦', '刚刚醒来', '模糊房间', '记忆碎片', '可探索空间', '记录今晚的梦', 'dream', 'journal'],
    required: true,
    experience: {
      anchor: .94,
      function: 'resolve',
      visualState: '所有记忆回声逐渐安静，房间恢复清晰，空白记录本成为唯一明确但不过度强调的行动落点。',
      continuity: '保留全过程的同一房间、机位和光色，使结尾像一次记忆回收，而不是新的产品广告画面。',
      integration: 'full-bleed-environment'
    }
  }
] as const;

export function selectProjectCreativeAssets(brief: string, limit = 3): ProjectCreativeAsset[] {
  const normalized = brief.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const scored = catalog
    .map((asset) => ({ asset, score: asset.tags.reduce((sum, tag) => sum + (normalized.includes(tag.toLocaleLowerCase()) ? tag.length : 0), 0) + (asset.required ? 2 : 0) }))
    .filter(({ score }) => score >= 4)
    .sort((left, right) => right.score - left.score || left.asset.id.localeCompare(right.asset.id));
  const exclusive = scored.find(({ asset, score }) => asset.exclusiveWhenMatched && score >= 8);
  const maximum = Math.max(0, Math.min(limit, 6));
  const selected = exclusive
    ? [
        ...scored.filter(({ asset }) => asset.companionFor?.includes(exclusive.asset.id)).slice(0, Math.max(0, maximum - 1)),
        exclusive
      ]
    : scored.slice(0, maximum);
  return selected
    .map(({ asset }) => ({ ...asset, tags: [...asset.tags] }))
    .sort((left, right) => (left.experience?.anchor ?? .5) - (right.experience?.anchor ?? .5));
}

export function projectCreativeAssetCatalog(): readonly ProjectCreativeAsset[] {
  return catalog;
}
