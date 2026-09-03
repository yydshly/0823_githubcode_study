import { describe, expect, it } from 'vitest';
import { buildV2AuthoringPrompt, createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';

describe('V2 style diversity guardrail', () => {
  it('uses archived-case distance for diagnostics without forcing style-axis changes', () => {
    const contract = createV2CreativeContract(
      '为一组城市声音档案设计日光下的编辑式网页，允许选择不同街区并比较声音证据。'
    );
    const decision = contract.technical.styleDiversity;

    expect(decision.minimumDifferentAxes).toBe(0);
    expect(decision.nearestDistance).toBeGreaterThanOrEqual(0);
    expect(decision.mustDifferOn).toEqual([]);
    expect(decision.rankingOnly).toBe(true);
    expect(new Set(Object.values(decision.fingerprint)).size).toBeGreaterThan(3);
  });

  it('ships the selected structure and anti-copy axes without the archived fingerprint payload', () => {
    const contract = createV2CreativeContract(
      '为一个日光陶瓷标本目录设计可触摸切换的网页，画面克制、真实。'
    );
    const execution = createCodexExecutionBrief(contract);
    const prompt = buildV2AuthoringPrompt(contract);
    const compact = JSON.parse(serializeCodexAuthoringBrief(contract));

    expect(execution.technical.styleDiversity.fingerprint).toEqual(contract.technical.styleDiversity.fingerprint);
    expect(compact.technical.styleDiversity).toMatchObject({
      structureDirection: contract.technical.styleDiversity.structureDirection,
      mustDifferOn: contract.technical.styleDiversity.mustDifferOn
    });
    expect(compact.technical.styleDiversity).not.toHaveProperty('fingerprint');
    expect(prompt).toContain('只提供风格诊断');
    expect(prompt).not.toContain('反同质化硬约束');
    expect(prompt).not.toContain('至少在 mustDifferOn');
  });

  it('recommends an experience form without forbidding alternative structures', () => {
    const calibration = createV2CreativeContract(
      '为投影安装设计校准工作台，同时调整距离、安装高度和偏角；画面尺寸、梯形与亮度实时同步更新，最后保存当前摆放方案。'
    );
    const dream = createV2CreativeContract(
      '为帮助人记录梦境的产品设计网页，滚动时同一房间从模糊逐渐形成可探索记忆，最后记录今晚的梦。'
    );

    expect(calibration.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'direct-instrument',
      controlVisibility: 'persistent',
      interactionStyle: 'direct-control',
      strength: 'advisory'
    });
    expect(dream.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'continuous-stage',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'spatial-journey',
      controlVisibility: 'contextual',
      interactionStyle: 'scroll',
      strength: 'advisory'
    });
  });

  it('keeps non-concurrent direct tasks out of persistent parameter controls', () => {
    const soundboard = createV2CreativeContract(
      '为制琴师设计云杉音板调音台，调整厚度时同步更新频率、共振、风险与敲击听感，最后保存方案。'
    );
    const curation = createV2CreativeContract(
      '为独立书店设计日光选书桌。拖动情绪纸带会重排书封、引文卡和阅读路径，最后生成选书单。'
    );
    const rejectedPanel = createV2CreativeContract(
      '为投影安装设计校准工作台，同时调整距离、安装高度和偏角；画面尺寸、梯形与亮度实时同步更新，最后保存当前摆放方案。不要持久参数面板。'
    );

    expect(soundboard.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      controlVisibility: 'contextual'
    });
    expect(curation.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      controlVisibility: 'contextual'
    });
    expect(rejectedPanel.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      controlVisibility: 'contextual'
    });
  });

  it('routes an experimental cultural archive to editorial narrative without a persistent workbench', () => {
    const contract = createV2CreativeContract(
      '为一间收藏雨后街区气味的独立档案馆设计实验性杂志网页。滚动时旧书、柏油和晚桂的气味痕迹逐渐扩散，最后进入本月气味档案。'
    );

    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'editorial-evidence',
      surfaceArchetype: 'editorial-narrative',
      controlVisibility: 'none',
      interactionStyle: 'scroll',
      strength: 'advisory'
    });
  });

  it('routes maps and archives away from the recent parameter-workbench shell', () => {
    const map = createV2CreativeContract(
      '为城市公共饮水点设计明亮地图，选择站点后更新路线、距离和开放状态。'
    );
    const archive = createV2CreativeContract(
      '为消失的老电影院制作数字档案，以票根、年代、立面和口述证据组织阅读。'
    );

    expect(map.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'spatial-atlas',
      workbenchPolicy: 'allowed'
    });
    expect(archive.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'editorial-evidence',
      workbenchPolicy: 'allowed'
    });
  });

  it('uses a direct curation workspace without inventing persistent parameter controls or sound', () => {
    const contract = createV2CreativeContract(
      '为独立书店设计日光选书桌。拖动情绪纸带会重排书封、引文卡和阅读路径，最后生成选书单；使用实体纸张与编辑排版语言。'
    );

    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      controlVisibility: 'contextual'
    });
    expect(contract.technical.productSemanticFeedback.selected).toBe(false);
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'pointer',
      pointerRole: 'primary'
    });
    expect(contract.direction.interaction.semanticAction).toContain('直接拖动');
    expect(contract.direction.interaction.semanticAction).toContain('direct-manipulation');
  });

  it('routes a drag-driven packing workbench as direct manipulation instead of scroll or path navigation', () => {
    const contract = createV2CreativeContract(
      '为短途出行者设计登机箱装箱桌。拖动衣物、相机、药盒和水杯放入、移位或取出，直接改变同一只登机箱的占用关系；调整装入状态时，重量、安检提醒和装箱单结果同步更新，最后生成装箱单。'
    );

    expect(contract.technical.styleDiversity.structureDirection.experienceForm).toBe('direct-workbench');
    expect(contract.technical.styleDiversity.structureDirection.controlVisibility).toBe('contextual');
    expect(contract.direction.interaction.primaryInput).toBe('pointer');
    expect(contract.direction.interaction.semanticAction).toContain('拖动物件');
    expect(contract.direction.interaction.semanticAction).toContain('位置、占用关系与业务结果同步变化');
    expect(contract.direction.interaction.touchAlternative).toContain('放入和取出');
    expect(contract.direction.interaction.keyboardAlternative).toContain('放入、取出');
    expect(createCodexExecutionBrief(contract).authoring.primaryJourney).toMatchObject({
      input: 'pointer',
      markers: { control: 'data-signal-primary-control' }
    });
  });

  it('does not turn a rejected map interface into the style direction for an archive story', () => {
    const contract = createV2CreativeContract(
      '为一座城市逐渐消失的老电影院制作数字档案网页。开场是当代街景中仍亮着的最后一块老招牌；滚动时，不同时期的票根、立面与放映声沿同一街区的真实位置逐渐重叠，访客可以选择年代查看同一地点的变化，最后收束为“保存一段城市放映记忆”。画面像白天的城市档案与旧胶片册，温暖、克制、可阅读。不要标准地图界面、暗色电影海报、巨型标题、随机粒子或章节模板。'
    );
    const fingerprint = contract.technical.styleDiversity.fingerprint;

    expect(contract.technical.placeGrounding.strategy).toBe('place-narrative');
    expect(contract.technical.placeGrounding.requirements.map).toBe('avoid');
    expect(fingerprint.composition).toBe('editorial-grid');
    expect(fingerprint.palette).not.toBe('dark-luminous');
    expect(fingerprint.media).not.toBe('canvas-2d');
  });

  it('routes a bright community repair tool away from cinematic product pages', () => {
    const contract = createV2CreativeContract(
      '为社区维修工作坊设计一张明亮、实用的老式台式电风扇诊断网页。页面主体是一幅程序化剖面与彩色装配示意，不对应任何商业型号，也不需要真实商品图。访客选择“不转、异响、风力变弱”后，同步更新故障部件、检查顺序、安全提示和预计难度；横向查看诊断、拆解、测试三个工作阶段，最后行动为“预约一张维修桌”。画面像工业说明书、彩色装配图与社区公告，清晰、亲切、可操作。不要暗色全屏、中央产品海报、巨型标题、电影式长滚动、随机粒子或玻璃科技界面。'
    );
    const fingerprint = contract.technical.styleDiversity.fingerprint;

    expect(fingerprint.composition).toBe('split-stage');
    expect(fingerprint.palette).toBe('daylight-neutral');
    expect(fingerprint.motion).toBe('state-switch');
    expect(fingerprint.media).toBe('procedural-3d');
    expect(fingerprint.composition).not.toBe('full-bleed-cinematic');
    expect(fingerprint.palette).not.toBe('dark-luminous');
    expect(contract.experience.pattern).toBe('editorial-field');
    expect(buildV2AuthoringPrompt(contract)).toContain('内容根节点必须保持透明');
  });
});
