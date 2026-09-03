import type { StateAssetEvidence } from '../v2/state-asset-strategy.ts';
import type { AssetCandidate } from './asset-plan.ts';

export interface ProjectCreativeAsset {
  id: string;
  uri: string;
  bundlePath: string;
  kind: 'image' | 'texture' | 'environment' | 'model-3d' | 'audio' | 'video' | 'font';
  source: 'chatgpt-generated' | 'model-generated' | 'user-provided' | 'licensed';
  qualityLevel?: 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
  role: string;
  description: string;
  payloadBytes: number;
  features?: AssetCandidate['features'];
  tags: readonly string[];
  /** Subject identity anchors. Generic task words such as "archive" or
   * "restoration" may contribute to ranking, but cannot select the asset on
   * their own. When omitted, the first four tags are treated as anchors. */
  topicAnchors?: readonly string[];
  required?: boolean;
  exclusiveWhenMatched?: boolean;
  companionFor?: readonly string[];
  experience?: {
    anchor: number;
    function: 'establish' | 'develop' | 'transform' | 'resolve' | 'persistent';
    visualState: string;
    continuity: string;
    integration: 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | 'native-media';
    stateEvidence?: StateAssetEvidence;
  };
}

const catalog: readonly ProjectCreativeAsset[] = [
  {
    id: 'rooftop-greenhouse-environment-v1',
    uri: '/creative-assets/r84-rooftop-greenhouse/greenhouse-master-v1.png',
    bundlePath: 'assets/greenhouse-master-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    qualityLevel: 'L4-cinematic',
    role: 'pixel-aligned full-bleed rooftop greenhouse dawn environment',
    description: '清晨城市屋顶温室的同一机位母图：左侧结露玻璃、中央湿润通道、中景番茄藤与后景城市天际线形成可信的前中后景，可作为全部 2.5D 图层的透视和光线基准。',
    payloadBytes: 2_665_934,
    tags: ['城市屋顶温室', '屋顶温室', '结露玻璃', '番茄藤', '城市天际线', '湿度', '温室记录', 'rooftop greenhouse'],
    required: true,
    experience: {
      anchor: .16,
      function: 'persistent',
      visualState: '全幅清晨温室从结露玻璃外向内部展开，通道、番茄藤和城市天际线始终保持同一空间坐标。',
      continuity: '与番茄藤透明层、露珠前景层和深度场共享 1672×941 画布、同一镜位、透视、晨光方向和尺度。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'rooftop-greenhouse-subject-v1',
    uri: '/creative-assets/r84-rooftop-greenhouse/greenhouse-subject-v1.png',
    bundlePath: 'assets/greenhouse-subject-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'pixel-aligned transparent tomato-vine subject layer',
    description: '从同一温室母图提取的真实 Alpha 番茄藤主体，保留植株、果实、支撑杆和原始晨光，可在克制位移下形成中景视差并承接湿度状态。',
    payloadBytes: 917_757,
    features: { alpha: 'soft', depth: 'none' },
    tags: ['城市屋顶温室', '屋顶温室', '结露玻璃', '番茄藤', '城市天际线', '湿度', '温室记录', 'rooftop greenhouse'],
    required: true,
    experience: {
      anchor: .46,
      function: 'persistent',
      visualState: '同一株番茄藤作为中景主体独立于环境轻微推进，果实、叶片与支撑关系始终可辨认。',
      continuity: '透明层与母图保持完全相同的 1672×941 坐标和受光，仅允许小幅视差与凝露覆盖变化，禁止放大暴露边缘。',
      integration: 'alpha-subject'
    }
  },
  {
    id: 'rooftop-greenhouse-foreground-v1',
    uri: '/creative-assets/r84-rooftop-greenhouse/greenhouse-foreground-dew-v1.svg',
    bundlePath: 'assets/greenhouse-foreground-dew-v1.svg',
    kind: 'image',
    source: 'model-generated',
    qualityLevel: 'L3-presentable',
    role: 'pixel-aligned transparent near-glass dew overlay',
    description: '与母图同尺寸的透明露珠和薄雾 SVG 前景；用于近景遮挡、滚动视差和湿度滑杆反馈，不包含伪棋盘格或不透明背景。',
    payloadBytes: 2_662,
    features: { alpha: 'soft', depth: 'none' },
    tags: ['城市屋顶温室', '屋顶温室', '结露玻璃', '番茄藤', '城市天际线', '湿度', '温室记录', 'rooftop greenhouse'],
    required: true,
    experience: {
      anchor: .58,
      function: 'transform',
      visualState: '靠近镜头的玻璃露珠以比番茄藤更快的速度移动，并随湿度值改变可见覆盖范围。',
      continuity: '透明 SVG 与母图保持相同画布；色温和光向继承清晨玻璃，始终以柔和遮罩融入而不是形成矩形贴片。',
      integration: 'alpha-subject'
    }
  },
  {
    id: 'rooftop-greenhouse-depth-v1',
    uri: '/creative-assets/r84-rooftop-greenhouse/greenhouse-depth-field-v1.svg',
    bundlePath: 'assets/greenhouse-depth-field-v1.svg',
    kind: 'texture',
    source: 'model-generated',
    qualityLevel: 'L2-inspectable',
    role: 'pixel-aligned authored depth and state field',
    description: '与温室母图坐标一致的可检查灰度深度场：近景玻璃最亮、番茄藤为中近景、温室结构与天际线逐级后退；用于约束景深、遮挡和位移幅度。',
    payloadBytes: 1_215,
    tags: ['城市屋顶温室', '屋顶温室', '结露玻璃', '番茄藤', '城市天际线', '湿度', '温室记录', 'rooftop greenhouse'],
    required: true,
    experience: {
      anchor: .62,
      function: 'persistent',
      visualState: '同一构图的近景玻璃、中景番茄藤、温室框架和远景城市具有可验证的不同深度值。',
      continuity: '深度场严格保持 1672×941 像素坐标，并与环境、主体和露珠前景共同决定视差、景深和湿度遮罩。',
      integration: 'seamless-field'
    }
  },
  {
    id: 'collapsible-lantern-four-state-v1',
    uri: '/creative-assets/r64-collapsible-lantern-four-state-v1.png',
    bundlePath: 'assets/r64-collapsible-lantern-four-state-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'same-camera four-state collapsible daylight camping lantern subject',
    description: '同一盏无品牌露营灯在同一机位和自然日光下呈现扁平收纳、部分展开、完全展开和暖光点亮四个状态；铝环、提手、象牙色折叠灯罩、底座与接地阴影保持连续。',
    payloadBytes: 1_741_984,
    tags: ['可折叠日光露营灯', '可折叠露营灯', '露营灯', '折叠灯', '扁平收纳', '半展开', '完全展开', '温暖点亮', 'camping lantern', 'collapsible lantern'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .5,
      function: 'persistent',
      visualState: '同一盏露营灯由扁平收纳逐步展开，并在最终状态由内部暖光照亮完整灯罩。',
      continuity: '相机、产品尺度、铝环、提手、折叠灯罩、底座、自然日光与接地阴影保持一致，只改变灯罩展开高度和内部点亮状态。',
      integration: 'full-bleed-environment',
      stateEvidence: {
        mode: 'sequence',
        distinctStates: 4,
        partGroups: 3,
        continuityKey: 'collapsible-lantern-daylight-camera-v1',
        proof: '2×2 状态母图提供扁平、部分展开、完全展开和点亮四帧；同一提手、顶盖、折叠灯罩与底座可跨状态核对。'
      }
    }
  },
  {
    id: 'clock-restoration-four-state-v1',
    uri: '/creative-assets/r89-clock-restoration-state-atlas-v1.png',
    bundlePath: 'assets/r89-clock-restoration-state-atlas-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'same-camera four-state public mechanical clock restoration subject',
    description: '同一枚早期公共机械钟机芯在同一俯视机位、工作台和自然日光下呈现锈蚀完整、拆解排布、校准组装与修复走时四个连续状态；齿轮、夹板、轴杆和测量工具可跨状态核对。',
    payloadBytes: 2_782_267,
    tags: ['公共钟表', '机械钟表', '钟表修复', '机械钟机芯', '城市钟表档案', '锈蚀', '拆解', '校准', '重新走时', 'clock restoration', 'clock movement'],
    topicAnchors: ['公共钟表', '机械钟表', '钟表修复', '机械钟机芯', 'clock restoration', 'clock movement'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .5,
      function: 'persistent',
      visualState: '同一枚公共机械钟机芯由锈蚀完整状态进入拆解、校准，并最终恢复为可走时状态。',
      continuity: '机芯身份、机位、尺度、工作台、自然光和主要结构保持一致，只改变部件拆装、表面清洁与校准状态。',
      integration: 'full-bleed-environment',
      stateEvidence: {
        mode: 'sequence',
        distinctStates: 4,
        partGroups: 6,
        continuityKey: 'public-clock-restoration-workbench-v1',
        proof: '横向状态母图展示同一机芯的锈蚀完整、拆解排布、校准组装和修复走时四态；主体结构、镜位和工作台可连续核对。'
      }
    }
  },
  {
    id: 'mortise-tenon-four-state-v2',
    uri: '/creative-assets/r65-mortise-tenon-four-state-v2.png',
    bundlePath: 'assets/r65-mortise-tenon-four-state-v2.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'dimensionally corrected same-camera mortise-and-tenon assembly subject',
    description: '同一组旧木榫卯在同一机位下呈现分离、同轴对齐、半插入与榫肩贴合；榫头矩形截面明确小于卯口，四周保留装配间隙，删除了所有箭头、标注和辅助线。',
    payloadBytes: 2_492_101,
    tags: ['榫卯', '古建筑', '木构件', '木结构', '修复档案', '拆解课', '装配', '咬合', 'mortise', 'tenon', 'timber joint'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .48,
      function: 'persistent',
      visualState: '滚动连续显示同一矩形榫头由分离到同轴进入同一卯眼并由榫肩贴合的四个状态。',
      continuity: '构件身份、机位、比例、木纹、工作台、背景和左侧自然光保持一致；只改变榫头沿共同轴线的位置。',
      integration: 'full-bleed-environment',
      stateEvidence: {
        mode: 'sequence',
        distinctStates: 4,
        partGroups: 2,
        continuityKey: 'mortise-tenon-studio-camera-v2',
        proof: '2×2 状态母图明确证明矩形榫头小于卯口、同轴进入、半插入和最终榫肩贴合。'
      }
    }
  },
  {
    id: 'mortise-tenon-four-state-v1',
    uri: '/creative-assets/r62-mortise-tenon-four-state-v1.png',
    bundlePath: 'assets/r62-mortise-tenon-four-state-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'same-camera four-state mortise-and-tenon assembly subject',
    description: '同一组旧木榫卯在同一机位、工作台和自然光下呈现分离、对齐、半插入与完全咬合四个状态；素材本身通过连续性检查，但页面仍须让状态差异在关键验收帧中足够明显。',
    payloadBytes: 2_292_419,
    tags: ['榫卯', '古建筑', '木构件', '木结构', '修复档案', '拆解课', '装配', '咬合', 'mortise', 'tenon', 'timber joint'],
    required: true,
    exclusiveWhenMatched: false,
    experience: {
      anchor: .48,
      function: 'persistent',
      visualState: '滚动连续显示同一榫头由分离到完全进入同一卯眼的四个可辨状态。',
      continuity: '构件身份、机位、比例、木纹、工作台、背景和左侧自然光保持一致，只改变右侧榫头沿共同轴线的位置。',
      integration: 'full-bleed-environment',
      stateEvidence: {
        mode: 'sequence',
        distinctStates: 4,
        partGroups: 2,
        continuityKey: 'mortise-tenon-studio-camera-v1',
        proof: '2×2 状态母图提供分离、对齐、半插入与完全咬合四帧；R62 验证同时证明：有状态素材不等于页面已充分呈现状态差异。'
      }
    }
  },
  {
    id: 'mortise-tenon-museum-environment-v1',
    uri: '/creative-assets/r59-mortise-tenon-environment-v1.png',
    bundlePath: 'assets/r59-mortise-tenon-environment-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'persistent mortise-and-tenon conservation studio environment',
    description: '同一组真实旧木构件在修复工作台上沿共同轴线等待咬合；榫头、卯眼、木纹、手工凿痕与暖色自然光均清楚可辨，可持续承担对齐、受力解释和修复档案的空间底图。',
    payloadBytes: 2_285_335,
    tags: ['榫卯', '古建筑', '木构件', '木结构', '修复档案', '拆解课', 'mortise', 'tenon', 'timber joint'],
    required: false,
    exclusiveWhenMatched: false,
    experience: {
      anchor: .45,
      function: 'persistent',
      visualState: '两个带岁月痕迹的木构件保持同一机位与轴线，由分离逐步进入结构解释和咬合结果。',
      continuity: '榫头、卯眼、工作台、观察方向和左侧自然光全程不变，只改变裁切、焦点、相对距离与证据标注。',
      integration: 'full-bleed-environment',
      stateEvidence: {
        mode: 'static',
        distinctStates: 1,
        partGroups: 0,
        continuityKey: 'mortise-tenon-studio-camera-v1',
        proof: '单张环境图只证明同一机位、材质和空间；不证明构件逐步对齐、进入和咬合。'
      }
    }
  },
  {
    id: 'washi-final-print-v1',
    uri: '/creative-assets/r31-woodblock/washi-final-print-v1.png',
    bundlePath: 'assets/washi-final-print-v1.png',
    kind: 'image',
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: 'same-sheet final woodblock print hero texture',
    description: '透明背景的同一张手工和纸成品，包含靛蓝海浪、朱红飞鸟、纤维与压痕；适合通过 Shader 逐层显露墨色，不适合作为无关页面背景。',
    payloadBytes: 3_594_161,
    features: { alpha: 'soft', depth: 'none' },
    tags: ['木版', '套印', '和纸', '纸张纤维', '版画', '靛蓝', '朱红', '海浪', '飞鸟', '手工工坊', 'woodblock', 'washi'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .72,
      function: 'persistent',
      visualState: '同一张和纸从无墨、靛蓝海浪到朱红飞鸟逐层完成。',
      continuity: '纸张轮廓、纤维、画面坐标和光向全程保持不变，只改变墨层显露进度。',
      integration: 'alpha-subject'
    }
  },
  {
    id: 'cinema-memory-street-continuity-v1',
    uri: '/creative-assets/cinema-memory-street-continuity-v1.png',
    bundlePath: 'assets/cinema-memory-street-continuity-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'persistent same-camera cinema street archive across three eras',
    description: '同一座虚构社区影院、同一街角和同一机位的三段年代连续视觉；用于年代切换、档案叠化和最终记忆保存。它是艺术化档案演绎，不是特定城市或影院的真实历史证据，页面必须明确披露这一边界。',
    payloadBytes: 2_689_513,
    tags: ['老电影院', '电影院', '数字档案', '城市档案', '城市放映记忆', '老招牌', '票根', '年代', '同一地点', 'cinema memory'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .5,
      function: 'persistent',
      visualState: '同一影院建筑、招牌、门廊、街沿和相机位置始终对齐，三段年代状态通过柔和叠化而不是硬切卡片呈现。',
      continuity: '禁止替换建筑或机位；只能改变年代材质、胶片色彩、档案标注与局部街景细节，并始终标明为虚构场景的艺术化演绎。',
      integration: 'full-bleed-environment'
    }
  },
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
    features: { alpha: 'soft', depth: 'none' },
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
    features: { alpha: 'soft', depth: 'none' },
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
    features: { alpha: 'soft', depth: 'none' },
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
    features: { alpha: 'none', depth: 'none' },
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
  },
  {
    id: 'paper-restoration-damaged-v1',
    uri: '/creative-assets/r12-paper-restoration/paper-damaged-v1.png',
    bundlePath: 'assets/paper-restoration-damaged-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'opening damaged archival document on a conservation workbench',
    description: '同一页手写文献的破损开场：受潮水线、对角裂缝、卷曲纤维和模糊墨迹均可辨认；负责建立真实修复对象与工作台空间。',
    payloadBytes: 2_175_116,
    tags: ['纸本文献修复', '文献修复工坊', '纸张修复工坊', '待修复文献', '受潮旧纸', '手工补纸', '墨迹恢复', 'paper restoration', 'document conservation'],
    required: true,
    exclusiveWhenMatched: true,
    experience: {
      anchor: .06,
      function: 'establish',
      visualState: '全屏工作台中，同一页文献的潮渍、裂缝、卷曲边缘与手写墨迹形成唯一视觉焦点。',
      continuity: '纸页版式、对角裂缝、签名位置、机位、工具和暖色侧光必须与最终修复态保持一致。',
      integration: 'full-bleed-environment'
    }
  },
  {
    id: 'paper-restoration-resolved-v1',
    uri: '/creative-assets/r12-paper-restoration/paper-restored-v1.png',
    bundlePath: 'assets/paper-restoration-resolved-v1.png',
    kind: 'environment',
    source: 'chatgpt-generated',
    role: 'resolved state of the same conserved archival document',
    description: '同一页手写文献完成保守修复后的终点：裂缝闭合、纸面平复、墨迹可读，同时保留年代痕迹和真实修补边界。',
    payloadBytes: 2_600_120,
    tags: ['纸本文献修复', '文献修复工坊', '纸张修复工坊', '待修复文献', '受潮旧纸', '手工补纸', '墨迹恢复', 'paper restoration', 'document conservation'],
    required: true,
    companionFor: ['paper-restoration-damaged-v1'],
    experience: {
      anchor: .94,
      function: 'resolve',
      visualState: '同一机位下纸页完成可逆修补并恢复可读，安静工作台为提交待修复文献的行动留出空间。',
      continuity: '严格保留开场纸页的版式、签名、尺度、工作台、工具和光线方向，只改变损伤与可读状态。',
      integration: 'full-bleed-environment'
    }
  }
] as const;

export function selectProjectCreativeAssets(brief: string, limit = 3): ProjectCreativeAsset[] {
  const normalized = brief.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const scored = catalog
    .map((asset) => {
      const matches = asset.tags.filter((tag) => normalized.includes(tag.toLocaleLowerCase()));
      const score = matches.reduce((sum, tag) => sum + tag.length, 0);
      const topicAnchors = asset.topicAnchors?.length ? asset.topicAnchors : asset.tags.slice(0, 4);
      const anchorMatches = topicAnchors.filter((tag) => normalized.includes(tag.toLocaleLowerCase()));
      const hasTopicAnchor = anchorMatches.some((tag) => tag.length >= 4) || anchorMatches.length >= 2;
      return { asset, score, hasTopicAnchor };
    })
    .filter(({ score, hasTopicAnchor }) => score >= 4 && hasTopicAnchor)
    .sort((left, right) =>
      right.score - left.score
      || Number(Boolean(right.asset.required)) - Number(Boolean(left.asset.required))
      || Number(Boolean(right.asset.experience)) - Number(Boolean(left.asset.experience))
      || left.asset.id.localeCompare(right.asset.id)
    );
  const exclusive = scored.find(({ asset, score }) => asset.exclusiveWhenMatched && score >= 8);
  const maximum = Math.max(0, Math.min(limit, 6));
  const selected = exclusive
    ? [
        ...scored.filter(({ asset }) => asset.companionFor?.includes(exclusive.asset.id)).slice(0, Math.max(0, maximum - 1)),
        exclusive
      ]
    : scored.slice(0, maximum);
  return selected
    .map(({ asset }) => ({
      ...asset,
      tags: [...asset.tags],
      ...(asset.topicAnchors ? { topicAnchors: [...asset.topicAnchors] } : {}),
    }))
    .sort((left, right) => (left.experience?.anchor ?? .5) - (right.experience?.anchor ?? .5));
}

export function projectCreativeAssetCatalog(): readonly ProjectCreativeAsset[] {
  return catalog;
}

export function findProjectCreativeAssetById(id: string): ProjectCreativeAsset | null {
  const asset = catalog.find((candidate) => candidate.id === id);
  return asset ? {
    ...asset,
    tags: [...asset.tags],
    ...(asset.topicAnchors ? { topicAnchors: [...asset.topicAnchors] } : {}),
  } : null;
}
