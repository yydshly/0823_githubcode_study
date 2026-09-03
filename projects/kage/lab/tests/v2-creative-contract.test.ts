import { describe, expect, it } from 'vitest';
import { buildV2AuthoringPrompt, createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { creativeInstructionSchema } from '../src/v2/creative-instruction.ts';

describe('V2 creative contract capability integration', () => {
  it('keeps only current user requirements and universal quality gates hard', () => {
    const contract = createV2CreativeContract(
      '为社区剧场设计一张有互动的演出季网页，选择剧目后舞台、时间和购票行动同步变化。不要使用虚构演出数据。'
    );
    const hard = contract.instructions.filter((instruction) => instruction.strength === 'hard');
    const advisory = contract.instructions.filter((instruction) => instruction.strength === 'advisory');

    expect(hard.every((instruction) => instruction.source === 'user' || instruction.source === 'quality')).toBe(true);
    expect(hard.find((instruction) => instruction.source === 'user')).toMatchObject({
      scope: 'current-run',
      content: expect.stringContaining('不要使用虚构演出数据')
    });
    expect(hard.filter((instruction) => instruction.source === 'quality').every((instruction) => (
      instruction.scope === 'project-quality'
    ))).toBe(true);
    expect(advisory.some((instruction) => instruction.source === 'inference')).toBe(true);
    expect(advisory.some((instruction) => instruction.source === 'reference')).toBe(false);
    expect(hard.map((instruction) => instruction.content).join(' ')).not.toMatch(/固定三屏|暗色科技|巨型标题/);
  });

  it('does not force a low-relevance reference into the creative input', () => {
    const contract = createV2CreativeContract(
      '为社区剧场设计一张演出季网页，让访客理解本周节目并完成购票。'
    );

    expect(contract.instructions.some((instruction) => instruction.source === 'reference')).toBe(false);
  });

  it('rejects reference or inference instructions promoted to hard constraints', () => {
    expect(creativeInstructionSchema.safeParse({
      id: 'invalid-reference-hard',
      content: '沿用某案例的特定禁令。',
      source: 'reference',
      scope: 'current-run',
      strength: 'hard'
    }).success).toBe(false);
  });

  it('turns the dream brief into the verified media-scroll-scrub route', () => {
    const contract = createV2CreativeContract(
      '为一款帮助人记录梦境的产品设计网页。滚动时记忆碎片逐渐形成同一房间，最后收束为“记录今晚的梦”。安静、真实。'
    );

    expect(contract.experience.pattern).toBe('environmental-memory');
    expect(contract.technical.presentationStrategy).toBe('media-scroll-scrub');
    expect(contract.technical.capabilitySelection.selected).toBe(true);
    expect(contract.technical.capabilitySelection.capabilityId).toBe('media-scroll-scrub');
    expect(contract.assets[0]?.modality).toBe('image-sequence');
  });

  it('keeps a real GLB inspection request on a custom spatial route', () => {
    const contract = createV2CreativeContract(
      '为声学设备设计产品网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。'
    );

    expect(contract.technical.presentationStrategy).toBe('model-spatial');
    expect(contract.technical.capabilitySelection.selected).toBe(false);
    expect(contract.technical.capabilitySelection.contract).toBeNull();
    expect(contract.instructions).toContainEqual(expect.objectContaining({
      source: 'user',
      strength: 'hard',
      content: expect.stringContaining('必须使用真实 GLB')
    }));
  });

  it('keeps selected capability boundaries inside the compact Codex authoring input', () => {
    const contract = createV2CreativeContract(
      '为梦境记录产品设计连续滚动网页，记忆逐渐形成，最后开始记录。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(prompt).toContain('media-scroll-scrub');
    expect(prompt).toContain('maxInitialAssetBytes');
    expect(prompt).not.toContain('sourceCaseIds');
    expect(prompt).toContain('Three.js 只在确实承担空间');
    expect(contract.executionLimits.refinementPasses).toBe(1);
    expect(contract.executionLimits.stopAfterMinutes).toBe(3);
    expect(prompt).toContain('最多针对最高优先级缺陷进行一次局部修复');
  });

  it('uses a bounded editorial field for an unspecified page instead of inventing a cinematic scroll journey', () => {
    const contract = createV2CreativeContract(
      '为社区花园开放日设计明亮、亲切的网页，帮助居民查看活动并完成报名。'
    );
    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.technical.presentationStrategy).toBe('dom-led');
    expect(contract.experience.beats).toHaveLength(2);
    expect(contract.experience.structure.mode).toBe('editorial-flow');
  });

  it('derives a five-state continuous canvas for a layered print process without turning states into pages', () => {
    const contract = createV2CreativeContract(
      '为日光木版套印工坊设计网页，同一张和纸依次留下压痕、靛蓝墨层和朱红套色，最后预约亲手套印。'
    );

    expect(contract.experience.structure).toMatchObject({
      mode: 'continuous-canvas',
      segmentPolicy: 'content-derived'
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'paper-ready', 'pressure-trace', 'indigo-layer', 'vermilion-register', 'finished-imprint'
    ]);
    expect(buildV2AuthoringPrompt(contract)).toContain('不要求机械对应 DOM 页面数量');
  });

  it('routes a ceramic glaze brief to a parameter-driven Three.js material workspace', () => {
    const contract = createV2CreativeContract(
      '为一间面向独立陶艺创作者的釉色实验室设计交互网页。保持同一只未烧制的陶瓷器物始终可见，用户调整氧化铁、长石和灰釉比例，并选择烧成温度时，器物表面的颜色、光泽、细裂纹和流釉边界要产生有因果的变化；同时更新配方数值和结果解释，最后行动是“保存这份釉色配方”。页面明亮、安静。'
    );

    expect(contract.experience.pattern).toBe('material-transformation');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'raw-clay', 'mixture-response', 'kiln-result', 'saved-formula'
    ]);
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'direct-navigation',
      semanticAction: expect.stringContaining('直接调整参数')
    });
    expect(contract.direction.renderer).toMatchObject({
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl'
    });
    expect(contract.assets[0]).toMatchObject({
      id: 'procedural-material-subject',
      modality: 'procedural',
      integration: 'native-procedural'
    });
    expect(contract.assets[1]).toMatchObject({
      id: 'material-subject-reference',
      modality: 'transparent-image',
      required: false,
      minimumQuality: 'L2-inspectable',
      sourcePriority: ['primary-image-model', 'curated-library', 'user-supplied', 'minimax-fallback']
    });
    expect(contract.visualAnchor.source).toBe('hybrid');
    expect(contract.assets[0]?.visibleProof).toContain('材料比例或温度');
    expect(contract.technical.semanticInteraction.selected).toBe(true);
    expect(contract.acceptance).toContainEqual(expect.objectContaining({
      id: 'semantic-state-consistent',
      priority: 'high'
    }));
    expect(buildV2AuthoringPrompt(contract)).toContain('不能预先禁止其中任何一种');
    expect(buildV2AuthoringPrompt(contract)).toContain('圆柱、蛋形、球体或圆环拼接只能作为草模');
  });

  it('routes a paper sundial simulation by its causal task instead of its styling material', () => {
    const contract = createV2CreativeContract(
      '为中学生设计一个明亮的桌面日晷实验网页。始终显示同一座纸质日晷和自然日光场。调整时间、纬度和季节控件时，晷针影子的方向、长度、刻度落点与早午晚解释同步变化；切换比较两天时，在同一构图中显示第二条半透明影子；最后行动是保存观察记录。所有结果明确标注为教学模拟。页面使用浅木、纸张和日光。'
    );

    expect(contract.intent).toMatchObject({
      subject: '明亮的桌面日晷实验',
      audience: '中学生',
      primaryAction: '保存观察记录'
    });
    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'simulation-baseline', 'causal-response', 'observation-saved'
    ]);
    expect(contract.assets[0]).toMatchObject({
      id: 'causal-simulation-field',
      modality: 'procedural',
      required: true
    });
    expect(contract.technical.semanticInteraction.selected).toBe(true);
  });

  it('treats audible feedback as a product requirement instead of a decorative effect', () => {
    const contract = createV2CreativeContract(
      '为制琴师设计云杉音板调音台。调整厚度时，同一音板的形态、频率、共振和敲击听感同步变化；提供 A/B 声音对比，最后保存调校方案。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.technical.productSemanticFeedback).toMatchObject({
      selected: true,
      capabilityId: 'product-semantic-audio-feedback',
      authoringContract: {
        comparison: 'a-b-or-before-after',
        stateBinding: 'same-causal-state-as-visual-result'
      }
    });
    expect(contract.acceptance.find((item) => item.id === 'semantic-state-consistent')?.assertion)
      .toContain('可听结果');
    expect(prompt).toContain('波形动画、频率数字和图片不能替代真实可听反馈');
  });

  it('keeps a sonic editorial brief out of the material-transformation fallback', () => {
    const contract = createV2CreativeContract(
      '为一部没有画面的午夜电台短篇小说设计可聆听网页，声音为主，文字和声音共同构成排版画面。切换耳语、雨点、远钟时同步改变字距、标点、章节情绪与试听结果；使用夜纸灰并保存这一段夜话。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.experience.structure.mode).toBe('editorial-flow');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'unfinished-line', 'voices-emerge', 'night-composes', 'quiet-save'
    ]);
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'typographic-sonic-field',
      workbenchPolicy: 'allowed',
      strength: 'advisory'
    });
    expect(contract.technical.productSemanticFeedback.selected).toBe(true);
    expect(contract.visualAnchor.subject).toContain('主题专属声音编辑锚点');
    expect(contract.visualAnchor.relationshipToBrief).toMatch(/通用网格.*圆环.*装饰性线条/);
    expect(contract.visualAnchor.interactionBinding).toMatch(/结构差异.*真实可听结果/);
    expect(contract.visualAnchor.fallback).toMatch(/通用网格.*圆环.*线条占位/);
    expect(contract.experience.beats[0]?.visibleState).toMatch(/首屏主标题.*试听入口.*第一个声部/);
    expect(contract.experience.reducedMotion).toMatch(/390px.*主标题.*试听入口.*当前结果.*保存行动/);
    expect(prompt).toContain('圆环');
    expect(prompt).toContain('390px');
  });

  it('treats paper styling in an interactive book curation brief as editorial language, not material transformation', () => {
    const contract = createV2CreativeContract(
      '为一间独立书店设计日光下的选书桌网页。拖动情绪纸带时，书封、引文卡和阅读路径实时重排，最后生成“带走我的选书单”。画面像实体纸张与当代编辑设计。'
    );

    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      strength: 'advisory'
    });
    expect(contract.technical.styleDiversity.structureDirection.experienceForm)
      .not.toBe('typographic-sonic-field');
  });

  it('does not treat generic paper and typography styling as a material process', () => {
    const contract = createV2CreativeContract(
      '为一份社区文化杂志设计明亮网页，使用纸张触感和意外的排版关系组织人物文章，最后行动为订阅下一期。'
    );

    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.technical.styleDiversity.structureDirection.experienceForm)
      .not.toBe('typographic-sonic-field');
  });

  it('routes a botanical observation table to a theme-specific procedural workspace', () => {
    const contract = createV2CreativeContract(
      '为儿童自然教育设计一张明亮、有触感的植物观察网页。叶片、种子和根系像真实桌面教具一样分区排列；完整叶片与可拖动放大镜是持续视觉主体。选择不同标本并拖动放大镜时，叶脉结构、含水量和生长阶段证据必须在同一标本上同步变化，最后行动为“开始一次观察”。不要暗色电影感、通用网格、圆环或无意义粒子。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.intent).toMatchObject({
      subject: '植物观察标本桌',
      desiredFeeling: '真实、自然',
      primaryAction: '开始一次观察'
    });
    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'specimen-table', 'lens-evidence', 'observation-ready'
    ]);
    expect(contract.technical.presentationStrategy).toBe('procedural-field');
    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid',
      required: false,
      failurePolicy: 'continue-with-declared-fallback'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'botanical-specimen-field',
      role: 'subject',
      modality: 'procedural',
      required: true
    }));
    expect(contract.visualAnchor).toMatchObject({
      heroRole: 'evidence-field',
      source: 'procedural'
    });
    expect(contract.visualAnchor.subject).toMatch(/完整叶片标本.*放大镜/);
    expect(contract.visualAnchor.interactionBinding).toMatch(/叶脉结构.*含水量.*生长阶段/);
    expect(contract.visualAnchor.relationshipToBrief).toMatch(/通用网格.*圆环/);
    expect(prompt).toContain('植物观察标本桌');
  });

  it('keeps the requested wind-tunnel subject instead of mistaking its classroom context for the subject', () => {
    const contract = createV2CreativeContract(
      '为自然科学课设计一张明亮的候鸟风洞观察网页。始终显示同一只纸翼候鸟模型和一段可读的气流场。调整风速、侧风角度和翼面倾角时，模型姿态、气流线、预计升力、漂移方向和解释同步变化；最终行动是“保存这次飞行观察”。所有数值明确标注为教学模拟。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.intent.subject).toBe('明亮的候鸟风洞观察');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'simulation-baseline', 'causal-response', 'observation-saved'
    ]);
    expect(prompt).toContain('不能缩成图标');
  });

  it('routes explicit demo, wheel and manual inputs through one shared state without making it a global default', () => {
    const interactive = createV2CreativeContract(
      '为候鸟风洞设计教学模拟网页，提供自动演示，鼠标滚轮与三个参数滑块驱动同一飞行状态，手动操作停止演示，最后保存观察。'
    );
    const ordinaryScroll = createV2CreativeContract(
      '为梦境记录产品设计连续滚动网页，同一房间逐渐清晰，最后开始记录。'
    );

    expect(interactive.technical.interactionDriver).toMatchObject({
      selected: true,
      capabilityId: 'shared-state-interaction-driver',
      requestedModes: ['manual', 'scroll', 'demo'],
      authoringContract: {
        stateModel: 'single-canonical-state',
        manualOverride: 'first-user-input-stops-demo'
      }
    });
    expect(interactive.acceptance.find((item) => item.id === 'semantic-state-consistent')?.assertion)
      .toContain('播放、暂停、重置与首次人工接管');
    expect(buildV2AuthoringPrompt(interactive)).toContain('selected=false 时禁止自行加入自动演示');
    expect(ordinaryScroll.technical.interactionDriver.selected).toBe(false);
  });

  it('routes a stage-lighting rehearsal brief to a direct Three.js spatial workspace', () => {
    const contract = createV2CreativeContract(
      '为独立剧场灯光设计师制作实时灯光排练台。保持同一黑盒舞台，选择灯具并调整俯仰、方位、光束角、亮度和色片时，同步改变光束、落点、阴影与照度；切换 cue 后保存第一幕灯光方案。'
    );

    expect(contract.experience.pattern).toBe('product-atmosphere');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'stage-rig', 'focus-response', 'cue-rehearsal', 'lighting-saved'
    ]);
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'direct-navigation',
      semanticAction: expect.stringContaining('直接调整参数')
    });
    expect(contract.direction.renderer).toMatchObject({
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl'
    });
    expect(contract.assets.map((asset) => asset.id)).toEqual(['stage-lighting-field', 'lighting-evidence']);
    expect(contract.technical.semanticInteraction.selected).toBe(true);
    expect(contract.acceptance.find((item) => item.id === 'intent-visible')?.assertion).toContain('10 秒');
    expect(contract.acceptance.find((item) => item.id === 'process-causal')?.assertion).toContain('高层操作');
    expect(contract.acceptance.find((item) => item.id === 'process-causal')?.assertion).toContain('data-signal-visual-anchor');
    expect(contract.acceptance.find((item) => item.id === 'semantic-state-consistent')?.assertion).toContain('虚假真实性');
    expect(contract.acceptance.find((item) => item.id === 'mobile-readable')?.assertion).toContain('主要控件→结果→最终行动');
  });

  it('routes a projector placement brief to a causal spatial setup workspace', () => {
    const contract = createV2CreativeContract(
      '为准备购买投影仪的小户型租住者设计一个家用投影仪摆放助手。保持同一明亮客厅，用户调整投影仪与墙面的距离、安装高度和水平偏角时，墙面画面尺寸、梯形、亮度与推荐提示同步变化；切换白天或夜间环境，最后保存推荐摆放位置。'
    );

    expect(contract.intent.subject).toBe('家用投影仪摆放助手');
    expect(contract.experience.pattern).toBe('product-atmosphere');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'room-baseline', 'placement-response', 'environment-check', 'placement-saved'
    ]);
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'direct-navigation',
      semanticAction: expect.stringContaining('直接调整参数')
    });
    expect(contract.direction.renderer).toMatchObject({
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl'
    });
    expect(contract.assets.map((asset) => asset.id)).toEqual(['spatial-setup-field', 'placement-evidence']);
    expect(contract.technical.presentationStrategy).toBe('procedural-field');
  });

  it('requires a theme-specific visual anchor instead of a generic safe background', () => {
    const contract = createV2CreativeContract(
      '为社区公共图书馆设计安静座位观察台，选择楼层和时段后同步更新采光、噪声、座位与建筑平面。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.visualAnchor).toMatchObject({
      heroRole: 'evidence-field',
      source: 'procedural'
    });
    expect(contract.visualAnchor.relationshipToBrief).toContain('社区公共图书馆');
    expect(contract.visualAnchor.interactionBinding).toContain('同步变化');
    expect(contract.acceptance).toContainEqual(expect.objectContaining({
      id: 'visual-anchor-specific',
      priority: 'blocker'
    }));
    expect(prompt).toContain('story.visualAnchor');
    expect(prompt).toContain('通用网格');
  });

  it('keeps continuous scroll only when the brief explicitly asks for temporal progression', () => {
    const contract = createV2CreativeContract(
      '为昼夜迁徙主题活动设计网页，滚动时从清晨逐渐进入夜晚，最后完成预约。'
    );
    expect(contract.experience.pattern).toBe('continuous-scroll');
  });

  it('keeps the persistent physical subject ahead of an opening environment description', () => {
    const contract = createV2CreativeContract(
      '为一座城市公共钟表修复档案设计交互网页。开场是一张明亮的修复工作台总览；滚动或拖动时间轴时，同一枚机械钟表从锈蚀、拆解、校准到重新走时连续变化，文字同步解释修复证据，最后行动为预约开放工作日。真实、温暖、编辑档案感，不要暗色科技风、巨型标题或随机粒子。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(contract.intent.subject).toBe('机械钟表');
    expect(contract.acceptance.find((item) => item.id === 'process-causal')).toMatchObject({
      priority: 'blocker',
      assertion: expect.stringContaining('data-signal-primary-result')
    });
    expect(prompt).toContain('authoring.primaryJourney');
    expect(prompt).toContain('不是四个页面、章节或固定屏');
    expect(prompt).toContain('authoring.subjectContinuity');
    expect(prompt).toContain('逐状态独立 cover');
  });

  it('selects semantic interaction only when the brief contains an information relationship', () => {
    const evidenceContract = createV2CreativeContract(
      '为海洋记忆数字展陈设计网页，需要档案证据、空间关系和可以选择的探索路径，比较不同年代的海岸变化。'
    );
    const dreamContract = createV2CreativeContract(
      '为梦境记录产品设计连续滚动网页，同一房间逐渐清晰，最后开始记录。'
    );

    expect(evidenceContract.technical.semanticInteraction).toMatchObject({
      selected: true,
      capabilityId: 'semantic-responsive-interaction'
    });
    expect(dreamContract.technical.semanticInteraction.selected).toBe(false);
    expect(buildV2AuthoringPrompt(evidenceContract)).toContain('semantic-responsive-interaction');
  });

  it('prefers attributable real geography for place decisions and rejects abstract map decoration', () => {
    const contract = createV2CreativeContract(
      '为城市公共饮水点设计明亮地图，选择站点时更新水质、距离和开放状态。'
    );
    const mapAsset = contract.assets.find((asset) => asset.id === 'map-evidence-field');

    expect(contract.technical.placeGrounding).toMatchObject({
      selected: true,
      capabilityId: 'place-grounded-experience',
      strategy: 'real-geography-evidence',
      requirements: {
        geography: 'real-grounded',
        map: 'required'
      }
    });
    expect(mapAsset?.modality).toBe('texture');
    expect(mapAsset?.sourcePriority).toEqual(['licensed', 'curated-library', 'procedural']);
    expect(mapAsset?.visualResponsibility).toContain('真实地理底图');
    expect(mapAsset?.visualResponsibility).toContain('道路层级');
    expect(mapAsset?.visualResponsibility).toContain('当前位置');
    expect(mapAsset?.visualResponsibility).toContain('随机线条');
    expect(mapAsset?.continuityRule).toContain('同一坐标变换');
    expect(mapAsset?.continuityRule).toContain('演示数据');
    expect(mapAsset?.visibleProof).toContain('真实区域');
    expect(mapAsset?.visibleProof).toContain('地图署名');
  });

  it('treats museum language as visual tone and recognizes explicit input-driven state changes', () => {
    const contract = createV2CreativeContract(
      '为气味记忆产品设计沉浸式网页，指针或触摸改变三种气味的混合比例并同步更新文字；画面像自然历史博物馆与香水实验室的结合。'
    );

    expect(contract.experience.pattern).toBe('environmental-memory');
    expect(contract.technical.semanticInteraction).toMatchObject({
      selected: true,
      capabilityId: 'semantic-responsive-interaction'
    });
    expect(contract.technical.semanticInteraction.reasons[0]).toContain('改变内容、比例或可见状态');
  });

  it('selects identity evidence only for briefs that connect brand and proof', () => {
    const identityContract = createV2CreativeContract(
      '为生物材料品牌建立网页身份，展示材料来源、研究过程、证据与最终成果。'
    );
    const atmosphereContract = createV2CreativeContract(
      '为夜间活动制作纯氛围网页，无需内容，只保留抽象光影。'
    );

    expect(identityContract.technical.identityEvidence).toMatchObject({
      selected: true,
      capabilityId: 'identity-through-evidence'
    });
    expect(atmosphereContract.technical.identityEvidence.selected).toBe(false);
    expect(buildV2AuthoringPrompt(identityContract)).toContain('identity-through-evidence');
  });
});
