export const githubExemplarResearchCases = [
  {
    id: 'threejs-iris-articulated-reveal',
    title: 'IRIS · 程序化关节主体展开',
    repositoryUrl: 'https://github.com/iamtechartist/Threejs-3D-Webpage',
    liveDemoUrl: 'https://iamtechartist.github.io/Threejs-3D-Webpage/',
    reviewedCommit: 'd827a2a409abc44ff35b4965e3d3aadfbe66278a',
    license: 'MIT',
    evidenceLevel: 'E4',
    evidenceSummary: '源码已审阅，并在桌面首/中/末状态、暂停控制、390px 视口与减少动态效果模式下完成本地运行验证。',
    architecture: [
      '固定 WebGL 画布负责空间主体，语义 DOM 负责章节、导航、状态与行动。',
      '程序化 BufferGeometry 构建外层花瓣、内层叶片、铰链、轨道和发光核心，不依赖外部 GLB。',
      '全局滚动进度被拆成每个部件的局部错峰进度，再共同驱动相机、形态、材质、灯光、雾与 Bloom。',
      '默认通过 WebGPURenderer 的 WebGLBackend 运行；URL 显式选择时才尝试 WebGPU。'
    ],
    reusableCapabilities: [
      '用“有部件关系的单一主体”贯穿首屏、展开和终点，避免逐屏更换无关视觉。',
      '把全局滚动映射为带相位差的局部部件进度，形成可读的组装、绽放或解构过程。',
      '镜头、结构、材质、曝光和后期共享同一叙事时间轴，避免各自动画造成漂移。',
      'DOM 保持可读内容和控制，WebGL 只承担无法由普通排版表达的结构变化。',
      '用像素比上限、减少动态效果、加载回退和可观测状态控制体验风险。',
      '只在抽象机械、生物结构或构造过程与主题直接相关时选择程序化可动主体。'
    ],
    limitations: [
      '程序化花瓣证明的是抽象可动主体，不等于可信产品模型，不能用于伪造真实硬件拆解。',
      '指针视差明确忽略触摸输入；移动端能滚动，但没有等价的触摸观察交互。',
      '单文件约两千行且依赖 CDN 模块，缺少模块边界、依赖锁定、离线构建和自动化测试。',
      '高细分几何、粒子和 Bloom 对低端移动设备仍有成本，必须按目标缩减。'
    ],
    selectionRule: '当 brief 明确要求单一抽象主体发生组装、绽放、展开或结构揭示，并且这种变化本身解释主题时才启用。',
    rejectionRule: '真实商品、人物、建筑或需要精确品牌资产的目标，没有可信资产时不得用这条路线替代。'
  }
] as const;

export const threejsIrisResearch = githubExemplarResearchCases[0];
