import {
  createV2CreativeContract,
  type V2CreativeContract
} from '../../src/v2/creative-contract.ts';
import { identityEvidenceCapability } from '../../src/v2/identity-evidence-capability.ts';
import { creativeDirectionAtlas, type CreativeDirection } from '../../src/v2/creative-direction-atlas.ts';
import { createCodexExecutionBrief } from '../../src/v2/codex-execution-brief.ts';
import {
  createDirectCreativeAuthorPackageV5,
  serializeDirectCreativeAuthorPackage,
  type DirectCreativeAuthorPackage
} from '../../src/v2/direct-creative-author-package.ts';
import { V25_VERIFIED_DELIVERIES } from '../../src/v2/v25-verified-deliveries.ts';
import { V3_VERIFIED_DELIVERIES } from '../../src/v2/v3-verified-deliveries.ts';
import {
  V2_EXPERIENCE_ARCHIVE,
  type ExperienceArchiveEntry
} from '../../src/v2/experience-archive.ts';
import {
  V2_FORMAL_PRODUCT_ARCHIVE,
  type FormalProductArchiveEntry
} from '../../src/v2/formal-product-archive.ts';

declare global {
  interface Window {
    __kageV2?: {
      createContract: (brief: string) => V2CreativeContract;
      authorPackage: () => DirectCreativeAuthorPackage;
      serializedPackage: () => string;
      snapshot: () => {
        contractId: string;
        pattern: string;
        strategy: string;
        capabilityId: string | null;
        capabilitySelected: boolean;
        semanticCapabilityId: string | null;
        semanticInteractionSelected: boolean;
        identityCapabilityId: string | null;
        identityEvidenceSelected: boolean;
        articulatedCapabilityId: string | null;
        articulatedSubjectSelected: boolean;
        audioFeedbackCapabilityId: string | null;
        audioFeedbackSelected: boolean;
        visualRole: string;
        mechanismIds: string[];
        rendererRoute: string;
        packageId: string;
        directRunId: string;
        visualAmbitionLevel: string;
        heroTitle: string;
        authoringBytes: number;
        deadlineAfterMs: number;
        wowGateRequired: boolean;
        baselineVersion: '2.5';
        v25ArchivedDeliveryCount: number;
        creativeProtocolVersion: 5;
        mediumDecision: string;
        v3ArchivedDeliveryCount: number;
        v3ArchivedDeliveryIds: string[];
        v3MediumRoutes: string[];
        effectSelectionPosition: string;
        effectCandidateCount: number;
        techniqueCountScored: false;
        effectSelectionRunState: 'pending' | 'selected' | 'stopped';
        effectSelectionResourcePermission: boolean;
        stale: boolean;
      };
    };
  }
}

const examples: Record<string, string> = {
  dream: '为一款帮助人记录梦境的产品设计网页。开场像刚刚醒来的模糊房间，滚动时记忆碎片逐渐形成可探索空间，最后收束为“记录今晚的梦”。安静、真实，不要常见科技风。',
  product: '为一款面向独立创作者的智能声音产品设计发布网页。先建立安静的使用情绪，再让产品的声场能力变得可见，最后收束为预约体验。克制、真实，不要炫技式粒子。',
  exhibit: '为海洋记忆数字展陈设计网页，面向学生和普通访客；需要档案证据、空间关系和可以选择的探索路径，最终引导开始探索。',
  material: '为可生长的生物材料品牌建立网页身份。展示材料来源、研究过程和性能证据：从一枚种子开始，纤维逐渐编织成夜间温室，最终形成完整建筑。自然、真实，不要紫色科技风。',
  articulated: '为一座记录潮汐方向的抽象机械罗盘设计沉浸式网页。滚动时六片陶瓷翼围绕发光核心逐层展开并完成校准，最后形成完整航向。安静、克制，不要粒子堆积。'
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少 V2 页面元素：${selector}`);
  return element;
}

const ui = {
  brief: requiredElement<HTMLTextAreaElement>('#brief-input'),
  plan: requiredElement<HTMLButtonElement>('#plan-button'),
  copy: requiredElement<HTMLButtonElement>('#copy-button'),
  status: requiredElement<HTMLElement>('#contract-status'),
  pattern: requiredElement<HTMLElement>('#contract-pattern'),
  thesis: requiredElement<HTMLElement>('#contract-thesis'),
  memory: requiredElement<HTMLElement>('#contract-memory'),
  intent: requiredElement<HTMLElement>('#intent-list'),
  references: requiredElement<HTMLElement>('#reference-list'),
  beats: requiredElement<HTMLElement>('#beat-list'),
  assets: requiredElement<HTMLElement>('#asset-list'),
  acceptance: requiredElement<HTMLElement>('#acceptance-list'),
  limits: requiredElement<HTMLElement>('#limit-list'),
  capability: requiredElement<HTMLElement>('#capability-strip'),
  capabilityName: requiredElement<HTMLElement>('#capability-name'),
  capabilityReason: requiredElement<HTMLElement>('#capability-reason'),
  capabilityDemo: requiredElement<HTMLAnchorElement>('#capability-demo'),
  semanticCapability: requiredElement<HTMLElement>('#semantic-capability'),
  semanticCapabilityName: requiredElement<HTMLElement>('#semantic-capability-name'),
  semanticCapabilityReason: requiredElement<HTMLElement>('#semantic-capability-reason'),
  semanticInputs: requiredElement<HTMLElement>('#semantic-inputs'),
  semanticOutputs: requiredElement<HTMLElement>('#semantic-outputs'),
  semanticFallback: requiredElement<HTMLElement>('#semantic-fallback'),
  identityCapability: requiredElement<HTMLElement>('#identity-capability'),
  identityCapabilityName: requiredElement<HTMLElement>('#identity-capability-name'),
  identityCapabilityReason: requiredElement<HTMLElement>('#identity-capability-reason'),
  identityInputs: requiredElement<HTMLElement>('#identity-inputs'),
  identityOutputs: requiredElement<HTMLElement>('#identity-outputs'),
  identityFallback: requiredElement<HTMLElement>('#identity-fallback'),
  articulatedCapability: requiredElement<HTMLElement>('#articulated-capability'),
  articulatedCapabilityName: requiredElement<HTMLElement>('#articulated-capability-name'),
  articulatedCapabilityReason: requiredElement<HTMLElement>('#articulated-capability-reason'),
  articulatedTopology: requiredElement<HTMLElement>('#articulated-topology'),
  articulatedTimeline: requiredElement<HTMLElement>('#articulated-timeline'),
  articulatedFallback: requiredElement<HTMLElement>('#articulated-fallback'),
  audioFeedbackCapability: requiredElement<HTMLElement>('#audio-feedback-capability'),
  audioFeedbackCapabilityName: requiredElement<HTMLElement>('#audio-feedback-capability-name'),
  audioFeedbackCapabilityReason: requiredElement<HTMLElement>('#audio-feedback-capability-reason'),
  audioFeedbackRoute: requiredElement<HTMLElement>('#audio-feedback-route'),
  audioFeedbackState: requiredElement<HTMLElement>('#audio-feedback-state'),
  audioFeedbackFallback: requiredElement<HTMLElement>('#audio-feedback-fallback'),
  directionRole: requiredElement<HTMLElement>('#direction-role'),
  directionRoute: requiredElement<HTMLElement>('#direction-route'),
  directionSummary: requiredElement<HTMLElement>('#direction-summary'),
  mechanisms: requiredElement<HTMLElement>('#mechanism-list'),
  interactionInput: requiredElement<HTMLElement>('#interaction-input'),
  interactionMeaning: requiredElement<HTMLElement>('#interaction-meaning'),
  rendererEnhancement: requiredElement<HTMLElement>('#renderer-enhancement'),
  rendererReason: requiredElement<HTMLElement>('#renderer-reason'),
  rendererFallback: requiredElement<HTMLElement>('#renderer-fallback'),
  styleFingerprint: requiredElement<HTMLElement>('#style-fingerprint'),
  styleDifference: requiredElement<HTMLElement>('#style-difference'),
  styleAvoid: requiredElement<HTMLElement>('#style-avoid'),
  build: requiredElement<HTMLButtonElement>('#build-button'),
  buildStructure: requiredElement<HTMLElement>('#build-structure'),
  contractLaunch: requiredElement<HTMLElement>('#contract-launch'),
  effectSelection: requiredElement<HTMLElement>('#effect-quality-selection'),
  effectSelectionPosition: requiredElement<HTMLElement>('#effect-selection-position'),
  effectSelectionCount: requiredElement<HTMLElement>('#effect-selection-count'),
  effectSelectionAxes: requiredElement<HTMLElement>('#effect-selection-axes'),
  effectSelectionNoBonus: requiredElement<HTMLElement>('#effect-selection-no-bonus'),
  effectSelectionStop: requiredElement<HTMLElement>('#effect-selection-stop'),
  effectSelectionGoal: requiredElement<HTMLElement>('#effect-selection-goal'),
  effectSelectionRunGuard: requiredElement<HTMLElement>('#effect-selection-run-guard'),
  effectSelectionRunState: requiredElement<HTMLElement>('#effect-selection-run-state'),
  effectSelectionRunNote: requiredElement<HTMLElement>('#effect-selection-run-note'),
  directPackage: requiredElement<HTMLElement>('#direct-package'),
  directPackageId: requiredElement<HTMLElement>('#direct-package-id'),
  directAmbition: requiredElement<HTMLElement>('#direct-ambition'),
  directHero: requiredElement<HTMLElement>('#direct-hero'),
  directMedium: requiredElement<HTMLElement>('#direct-medium'),
  directMediumAlternative: requiredElement<HTMLElement>('#direct-medium-alternative'),
  directRendering: requiredElement<HTMLElement>('#direct-rendering'),
  directMotion: requiredElement<HTMLElement>('#direct-motion'),
  directBudget: requiredElement<HTMLElement>('#direct-budget'),
  directDeadline: requiredElement<HTMLElement>('#direct-deadline'),
  directProductJourney: requiredElement<HTMLElement>('#direct-product-journey'),
  directProductAssets: requiredElement<HTMLElement>('#direct-product-assets'),
  directPackageNote: requiredElement<HTMLElement>('#direct-package-note'),
  directionAtlas: requiredElement<HTMLElement>('#creative-direction-grid')
};

let currentContract = createV2CreativeContract(ui.brief.value);
let currentPackage = createDirectCreativeAuthorPackageV5(currentContract);
let contractStale = false;

function textElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderIntent(contract: V2CreativeContract) {
  const rows = [
    ['主体', contract.intent.subject],
    ['受众', contract.intent.audience],
    ['感受', contract.intent.desiredFeeling],
    ['变化', contract.intent.narrativeChange],
    ['行动', contract.intent.primaryAction]
  ];
  ui.intent.replaceChildren(...rows.flatMap(([term, description]) => [
    textElement('dt', '', term),
    textElement('dd', '', description)
  ]));
}

function renderReferences(contract: V2CreativeContract) {
  const references = createCodexExecutionBrief(contract).references;
  if (!references.length) {
    ui.references.replaceChildren(textElement(
      'p',
      'empty-state',
      '当前想法与已验证案例相关性不足：不强行套用案例，由用户目标与质量门直接驱动创作。'
    ));
    return;
  }
  ui.references.replaceChildren(...references.map((reference, index) => {
    const article = document.createElement('article');
    const header = document.createElement('header');
    header.append(
      textElement('span', 'reference-index', `0${index + 1}`),
      textElement('span', `evidence-badge ${reference.source.evidenceLevel}`, reference.source.evidenceLevel === 'runtime-verified' ? '运行证据' : '源码与运行证据')
    );
    const link = document.createElement('a');
    link.href = referenceHref(reference.source.uri);
    link.textContent = `${reference.title} ↗`;
    const copy = textElement('p', '', reference.positiveBorrowPrinciples[0] ?? reference.relevanceReason);
    article.append(header, link, copy);
    return article;
  }));
}

function referenceHref(uri: string): string {
  if (/^https?:\/\//.test(uri)) return uri;
  if (uri.startsWith('../cases/')) return uri.replace('../cases/', '../../cases/');
  if (uri.startsWith('../pages/v2/')) return uri.replace('../pages/v2/', './');
  return `../../${uri.replace(/^\.\//, '')}`;
}

function renderBeats(contract: V2CreativeContract) {
  ui.beats.replaceChildren(...contract.experience.beats.map((beat, index) => {
    const article = document.createElement('article');
    article.style.setProperty('--position', String(beat.position));
    article.append(
      textElement('span', 'beat-number', `0${index + 1}`),
      textElement('small', '', `${Math.round(beat.position * 100)}% · ${beat.purpose}`),
      textElement('strong', '', beat.visibleState),
      textElement('p', '', beat.userProgression)
    );
    return article;
  }));
}

function renderAssets(contract: V2CreativeContract) {
  if (!contract.assets.length) {
    ui.assets.replaceChildren(textElement('p', 'empty-state', '当前路线无需外部素材；程序化场景必须自行证明视觉职责。'));
    return;
  }
  ui.assets.replaceChildren(...contract.assets.map((asset) => {
    const article = document.createElement('article');
    article.append(
      textElement('span', 'asset-meta', `${asset.required ? 'REQUIRED' : 'OPTIONAL'} · ${asset.modality}`),
      textElement('strong', '', asset.visualResponsibility),
      textElement('p', '', asset.continuityRule),
      textElement('small', '', `可见证据：${asset.visibleProof}`)
    );
    return article;
  }));
}

function renderAcceptance(contract: V2CreativeContract) {
  ui.acceptance.replaceChildren(...contract.acceptance.map((check) => {
    const item = document.createElement('li');
    item.dataset.priority = check.priority;
    item.append(
      textElement('span', '', check.priority.toUpperCase()),
      textElement('p', '', check.assertion),
      textElement('small', '', check.evidence)
    );
    return item;
  }));
  const limits = contract.executionLimits;
  ui.limits.replaceChildren(
    textElement('span', '', `1 次构建`),
    textElement('span', '', `最多 ${limits.refinementPasses} 次局部修复`),
    textElement('span', '', `${limits.stopAfterMinutes} 分钟停止`),
    textElement('span', '', '只归档最佳结果')
  );
}

function renderCapability(contract: V2CreativeContract) {
  const selection = contract.technical.capabilitySelection;
  ui.capability.dataset.selected = String(selection.selected);
  ui.capabilityName.textContent = selection.contract?.title ?? '本目标不启用连续媒体滚动';
  ui.capabilityReason.textContent = [
    ...selection.reasons,
    ...selection.blockers
  ].join(' ');
  ui.capabilityDemo.hidden = !selection.selected;
}

function renderSemanticInteraction(contract: V2CreativeContract) {
  const decision = contract.technical.semanticInteraction;
  const capability = decision.evaluatedCapability;
  ui.semanticCapability.dataset.selected = String(decision.selected);
  ui.semanticCapabilityName.textContent = decision.selected
    ? `已启用 · ${capability.id}`
    : '本目标不启用 · 保持克制';
  ui.semanticCapabilityReason.textContent = [...decision.reasons, ...decision.blockers].join(' ');
  ui.semanticInputs.textContent = capability.inputs.join(' · ').toUpperCase();
  ui.semanticOutputs.textContent = capability.outputs.map((output) => ({
    'scene-shape': '场景形态',
    'evidence-value': '证据数值',
    'narrative-layer': '叙事层',
    'selection-state': '选择状态'
  })[output]).join(' · ');
  ui.semanticFallback.textContent = capability.baseInterface;
}

function renderIdentityEvidence(contract: V2CreativeContract) {
  const decision = contract.technical.identityEvidence;
  ui.identityCapability.dataset.selected = String(decision.selected);
  ui.identityCapabilityName.textContent = decision.selected
    ? '已启用 · ' + identityEvidenceCapability.id
    : '本目标不启用 · 保持克制';
  ui.identityCapabilityReason.textContent = decision.reason;
  ui.identityInputs.textContent = identityEvidenceCapability.inputs.join(' · ').toUpperCase();
  ui.identityOutputs.textContent = '身份 · 主体 · 证据字段 · 行动';
  ui.identityFallback.textContent = identityEvidenceCapability.baseInterface;
}

function renderArticulatedSubject(contract: V2CreativeContract) {
  const decision = contract.technical.articulatedSubject;
  const capability = decision.contract;
  ui.articulatedCapability.dataset.selected = String(decision.selected);
  ui.articulatedCapabilityName.textContent = decision.selected
    ? '已启用 · 程序化关节主体'
    : '本目标不启用 · 使用更合适的素材路线';
  ui.articulatedCapabilityReason.textContent = [...decision.reasons, ...decision.blockers].join(' ');
  ui.articulatedTopology.textContent = capability
    ? `${capability.authoringContract.minimumPartGroups}–${capability.authoringContract.maximumPartGroups} 个有语义的部件组`
    : '不创建程序化部件拓扑';
  ui.articulatedTimeline.textContent = capability
    ? '全局进度 → 错峰局部进度 → 相机 / 材质 / 灯光 / 后期'
    : '由当前目标的已选路线决定';
  ui.articulatedFallback.textContent = capability
    ? '稳定关键状态 + 最终主体剪影 + 完整 DOM'
    : '遵循当前素材与渲染路线';
}

function renderProductSemanticFeedback(contract: V2CreativeContract) {
  const decision = contract.technical.productSemanticFeedback;
  const authoring = decision.authoringContract;
  ui.audioFeedbackCapability.dataset.selected = String(decision.selected);
  ui.audioFeedbackCapabilityName.textContent = decision.selected
    ? '已启用 · 产品语义声音反馈'
    : '本目标不启用 · 不强行加入声音';
  ui.audioFeedbackCapabilityReason.textContent = [...decision.reasons, ...decision.blockers].join(' ');
  ui.audioFeedbackRoute.textContent = authoring
    ? authoring.route.replaceAll('-', ' ').toUpperCase()
    : 'NOT REQUIRED';
  ui.audioFeedbackState.textContent = authoring
    ? `${authoring.stateBinding} · ${authoring.comparison}`.replaceAll('-', ' ').toUpperCase()
    : '视觉与业务结果仍遵循当前因果状态';
  ui.audioFeedbackFallback.textContent = authoring?.fallback ?? '不创建无业务意义的音频、播放控件或声波装饰。';
}

function renderDirection(contract: V2CreativeContract) {
  const direction = contract.direction;
  ui.directionRole.textContent = direction.visualRole.replaceAll('-', ' ').toUpperCase();
  ui.directionRoute.textContent = direction.renderer.route.replaceAll('-', ' ').toUpperCase();
  ui.directionSummary.textContent = direction.decisionSummary;
  ui.mechanisms.replaceChildren(...direction.mechanisms.map((mechanism, index) => {
    const article = document.createElement('article');
    article.append(
      textElement('span', 'mechanism-index', `0${index + 1} · ${mechanism.evidenceLevel}`),
      textElement('strong', '', mechanism.title),
      textElement('p', '', mechanism.job),
      textElement('small', '', `${mechanism.reason} 证据：${mechanism.sourceCaseIds.join(' · ')}`)
    );
    return article;
  }));
  ui.interactionInput.textContent = `${direction.interaction.primaryInput.toUpperCase()} · ${direction.interaction.pointerRole.toUpperCase()}`;
  ui.interactionMeaning.textContent = `${direction.interaction.semanticAction} 触屏：${direction.interaction.touchAlternative}`;
  ui.rendererEnhancement.textContent = direction.renderer.enhancement.toUpperCase();
  ui.rendererReason.textContent = `${direction.renderer.reason} ${direction.renderer.threeJustification}`;
  ui.rendererFallback.textContent = direction.renderer.fallback;
}

function renderStyleDiversity(contract: V2CreativeContract) {
  const decision = contract.technical.styleDiversity;
  ui.styleFingerprint.replaceChildren(...Object.entries(decision.fingerprint).map(([axis, value]) => {
    const item = document.createElement('div');
    item.append(
      textElement('span', '', styleAxisLabel(axis)),
      textElement('strong', '', styleValueLabel(value))
    );
    return item;
  }));
  ui.styleDifference.textContent = `候选方向，仅用于发现模板惯性与辅助排序：${decision.rationale}`;
  ui.styleAvoid.textContent = `${experienceFormLabel(decision.structureDirection.experienceForm)} · ${workbenchPolicyLabel(decision.structureDirection.workbenchPolicy)} · 不强制改变风格轴`;
}

function renderBuildLaunch(contract: V2CreativeContract) {
  const structure = contract.technical.styleDiversity.structureDirection;
  ui.build.dataset.contractId = contract.id;
  ui.build.disabled = false;
  ui.buildStructure.textContent = `${experienceFormLabel(structure.experienceForm)}（内容自适应） · ${workbenchPolicyLabel(structure.workbenchPolicy)} · 当前合同已绑定；修改想法后需重新生成。`;
}

function renderDirectPackage(contract: V2CreativeContract) {
  currentPackage = createDirectCreativeAuthorPackageV5(contract);
  const ambition = currentPackage.authoringInput.visualAmbition;
  const medium = currentPackage.authoringInput.mediumDecision;
  const budget = currentPackage.runSeed.attemptBudget.limits;
  const drivers = [...new Set(ambition.motion.map((beat) => beat.driver))];
  const supporting = ambition.rendering.supporting.length
    ? ` + ${ambition.rendering.supporting.join(' + ')}`
    : '';
  ui.directPackageId.textContent = `${currentPackage.packageId} · ${currentPackage.runSeed.id}`;
  ui.directPackage.dataset.protocolVersion = String(currentPackage.runSeed.creativeProtocolVersion);
  ui.directAmbition.textContent = `${ambition.intentLevel.toUpperCase()} · ${currentPackage.evidenceRequirements.wowGateRequired ? 'WOW GATE REQUIRED' : 'QUALITY GATE'}`;
  ui.directHero.textContent = `${ambition.hero.title} · ${ambition.hero.withinSeconds} 秒内出现`;
  ui.directMedium.dataset.mediumRoute = medium.preferred;
  ui.directMedium.textContent = `资源锚点 ${medium.preferred.toUpperCase()} · ${Math.round(medium.confidence * 100)}% · 非技术白名单`;
  ui.directMediumAlternative.textContent = medium.alternative
    ? `一次降级：${medium.alternative.route} · ${medium.alternative.trigger}`
    : '无预设降级；首选失败即按停止边界诚实结束。';
  ui.directRendering.textContent = `${ambition.rendering.primary}${supporting} · ${ambition.depth.mode}`.toUpperCase();
  ui.directMotion.textContent = `驱动：${drivers.join(' · ')}；最终按 ${currentPackage.evidenceRequirements.profile.requiredCheckpoints.join(' / ')} 验收。`;
  ui.directBudget.textContent = `${budget.assetBatches} 素材批次 · ${budget.builds} 构建 · ${budget.deterministicRepairs} 确定修复 · ${budget.visualRefinements} 视觉精修`;
  ui.directDeadline.textContent = `60 秒报告 · ${Math.round(currentPackage.timing.deadlineAfterMs / 60_000)} 分钟停止 · 0 静默重试`;
  const productPlan = currentPackage.runSeed.productDeliveryPlan!;
  ui.directProductJourney.textContent = productPlan.journey.map((step) => step.phase.toUpperCase()).join(' → ');
  ui.directProductAssets.textContent = `${productPlan.visualAssetPolicy} · 结果后必须具有真实后续路径`;
  ui.directPackageNote.textContent = '复制按钮会要求 Codex 先比较三个大胆、真正不同的效果命题，再只实现一个；完成视觉效果后还必须通过产品身份、核心使用、有效结果、后续路径与素材依据。';
}

function renderEffectQualitySelection(contract: V2CreativeContract) {
  const gate = createCodexExecutionBrief(contract).creativeDirection.effectQualitySelection;
  const axisLabels: Record<string, string> = {
    'theme-specific-memory': '主题记忆',
    'sensory-impact': '感官影响',
    'surprise-without-confusion': '惊喜且清晰',
    'runtime-meaning': '运行时意义',
    'craft-potential': '工艺潜力',
    'action-closure': '行动收束'
  };
  ui.effectSelection.dataset.state = 'ready';
  ui.effectSelectionPosition.textContent = gate.position.replaceAll('-', ' ').toUpperCase();
  ui.effectSelectionCount.textContent = `${gate.candidateContract.count} 个真正不同的方向`;
  ui.effectSelectionAxes.textContent = gate.evaluation.axes.map((axis) => axisLabels[axis]).join(' · ');
  ui.effectSelectionNoBonus.textContent = '技术数量 · 媒介名望 · 来源名望';
  ui.effectSelectionStop.textContent = gate.decision.noPassingCandidate === 'stop-before-assets'
    ? '全部不合格 → 素材前停止'
    : gate.decision.noPassingCandidate;
  ui.effectSelectionGoal.textContent = `目标回放：服务${gate.goalReplay.audience}；主题是“${gate.goalReplay.subject}”；目标变化是“${gate.goalReplay.desiredChange}”；主要行动是“${gate.goalReplay.primaryAction}”。`;
  const receipt = currentPackage.runSeed.effectSelectionReceipt;
  const runState = currentPackage.runSeed.stopReason
    ? 'stopped'
    : receipt
      ? 'selected'
      : 'pending';
  ui.effectSelectionRunGuard.dataset.runState = runState;
  ui.effectSelectionRunState.textContent = runState === 'selected'
    ? 'SELECTED · RESOURCES ALLOWED'
    : runState === 'stopped'
      ? 'STOPPED BEFORE ASSETS'
      : 'PENDING RECEIPT · ASSETS LOCKED';
  ui.effectSelectionRunNote.textContent = runState === 'selected'
    ? '有效最高目标适配候选已绑定；只允许进入一次素材批次和一次构建。'
    : runState === 'stopped'
      ? '无合格方向或回执无效；不会自动改选、换模型或重试。'
      : '当前不能进入素材或构建；有效最高候选绑定后才放行。';
}

function restoreCurrentContractActions() {
  contractStale = false;
  ui.copy.disabled = false;
  ui.copy.dataset.state = 'ready';
  resetCopyActionLabels();
  ui.contractLaunch.dataset.state = 'ready';
  ui.effectSelection.dataset.state = 'ready';
  ui.directPackage.dataset.state = 'ready';
  ui.build.removeAttribute('aria-disabled');
  ui.build.disabled = false;
  ui.status.dataset.state = 'ready';
  ui.status.textContent = ui.status.dataset.readyLabel ?? 'CONTRACT · READY';
}

function invalidateCurrentContract(
  message = 'INPUT CHANGED · REGENERATE',
  state: 'stale' | 'error' = 'stale'
) {
  contractStale = true;
  ui.copy.disabled = true;
  ui.copy.dataset.state = state;
  ui.copy.textContent = state === 'error' ? '修正输入后重新生成' : '先重新生成契约';
  ui.contractLaunch.dataset.state = 'stale';
  ui.effectSelection.dataset.state = 'stale';
  ui.directPackage.dataset.state = 'stale';
  ui.build.disabled = true;
  ui.build.setAttribute('aria-disabled', 'true');
  ui.status.dataset.state = state;
  ui.status.textContent = message;
  ui.directPackageNote.textContent = '当前摘要仍属于上一次合同，已停止复制与构建。请重新生成契约，避免把旧方向交给 Codex。';
}

function updateContractFreshness() {
  if (ui.brief.value.trim() === currentContract.brief) {
    restoreCurrentContractActions();
    return;
  }
  invalidateCurrentContract();
}

function render(contract: V2CreativeContract) {
  currentContract = contract;
  ui.pattern.textContent = `${contract.experience.pattern.replaceAll('-', ' ').toUpperCase()} · ${contract.technical.presentationStrategy.toUpperCase()}`;
  ui.thesis.textContent = contract.experience.thesis;
  ui.memory.textContent = contract.experience.finalMemoryPoint;
  const selectedScores = [
    contract.technical.capabilitySelection,
    contract.technical.articulatedSubject,
    contract.technical.semanticInteraction,
    contract.technical.identityEvidence,
    contract.technical.productSemanticFeedback
  ].filter((selection) => selection.selected);
  const readyLabel = selectedScores.length
    ? `CAPABILITY · ${selectedScores.length} SELECTED`
    : 'CONTRACT · CUSTOM ROUTE';
  ui.status.dataset.readyLabel = readyLabel;
  ui.status.textContent = readyLabel;
  renderCapability(contract);
  renderSemanticInteraction(contract);
  renderIdentityEvidence(contract);
  renderArticulatedSubject(contract);
  renderProductSemanticFeedback(contract);
  renderDirection(contract);
  renderStyleDiversity(contract);
  renderBuildLaunch(contract);
  renderDirectPackage(contract);
  renderEffectQualitySelection(contract);
  renderIntent(contract);
  renderReferences(contract);
  renderBeats(contract);
  renderAssets(contract);
  renderAcceptance(contract);
  restoreCurrentContractActions();
}

function styleAxisLabel(value: string): string {
  return ({ composition: '构图', palette: '色彩', motion: '运动', spatial: '空间', typography: '字体', media: '媒介' } as Record<string, string>)[value] ?? value;
}

function experienceFormLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['experienceForm']): string {
  return ({
    'continuous-stage': '连续叙事场',
    'direct-workbench': '直接操作工作台',
    'editorial-evidence': '编辑证据流',
    'spatial-atlas': '空间地图',
    'object-field': '对象场',
    'typographic-sonic-field': '声音排版场',
    'spatial-inspection': '空间检查场'
  } as const)[value];
}

function workbenchPolicyLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['workbenchPolicy']): string {
  return ({ required: '业务可能需要工作台', allowed: '工作台可选', forbidden: '工作台不是当前首选' } as const)[value];
}

function styleValueLabel(value: string): string {
  return ({
    'full-bleed-cinematic': '全屏电影', 'editorial-grid': '编辑网格', 'split-stage': '分屏过程',
    'spatial-map': '空间地图', 'object-catalog': '对象目录', 'typographic-canvas': '字体画布',
    'dark-luminous': '暗色发光', 'daylight-neutral': '日光中性', 'warm-material': '温暖材料',
    'high-key-monochrome': '高调单色', 'saturated-graphic': '饱和图形', 'earth-archive': '自然档案',
    'scroll-scrub': '滚动连续', 'direct-manipulation': '直接操控', 'state-switch': '状态选择',
    'horizontal-traverse': '横向穿行', 'spatial-inspection': '空间检查', 'microinteraction-only': '微交互为主',
    'single-hero': '单一主体', 'environment-journey': '环境旅程', 'modular-collection': '模块集合',
    'data-field': '数据场', 'foreground-background': '前后景', 'flat-editorial': '平面编辑',
    'editorial-serif': '编辑衬线', 'functional-sans': '功能无衬线', 'display-condensed': '窄体展示',
    'mono-instrument': '仪器等宽', 'quiet-small-scale': '安静小字号', 'image-led-minimal': '图像主导',
    'transparent-subject': '透明主体', 'image-sequence': '连续图像', 'real-3d': '真实 3D',
    'procedural-3d': '程序化 3D', 'canvas-2d': '2D Canvas', 'dom-led': 'DOM 主导'
  } as Record<string, string>)[value] ?? value;
}

function renderCreativeDirectionAtlas(directions: readonly CreativeDirection[]) {
  ui.directionAtlas.replaceChildren(...directions.map((direction, index) => {
    const contract = createV2CreativeContract(direction.brief);
    const card = document.createElement('article');
    card.className = 'creative-direction-card';
    card.dataset.directionId = direction.id;
    card.dataset.status = direction.status;
    const header = document.createElement('header');
    header.append(
      textElement('span', '', `${String(index + 1).padStart(2, '0')} · ${direction.category}`),
      textElement('small', '', directionStatusLabel(direction.status))
    );
    const style = document.createElement('div');
    style.className = 'creative-direction-style';
    style.append(...Object.entries(contract.technical.styleDiversity.fingerprint).map(([axis, value]) =>
      textElement('span', '', `${styleAxisLabel(axis)} ${styleValueLabel(value)}`)
    ));
    const evidence = textElement(
      'p', 'creative-direction-evidence',
      direction.capabilityIds.length ? `复用：${direction.capabilityIds.join(' · ')}` : '新能力缺口：真实 3D 资产检查'
    );
    const useDirection = document.createElement('button');
    useDirection.type = 'button';
    useDirection.className = 'creative-direction-use';
    useDirection.textContent = '用此方向生成 V3 契约 ↑';
    useDirection.addEventListener('click', () => {
      ui.brief.value = direction.brief;
      createAndRender();
      ui.brief.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ui.brief.focus({ preventScroll: true });
    });
    card.append(
      header,
      textElement('h3', '', direction.title),
      textElement('p', '', direction.proves),
      style,
      evidence,
      textElement('small', 'creative-direction-input', `输入边界：${direction.requiredInput}`),
      textElement('small', 'creative-direction-avoid', `避免：${direction.avoid}`),
      textElement('strong', 'creative-direction-renderer', direction.rendererIntent)
    );
    if (direction.result) {
      const result = document.createElement('a');
      result.className = 'creative-direction-result';
      result.href = direction.result.url;
      result.textContent = `查看已生成候选 · ${direction.result.note} ↗`;
      card.append(result);
    }
    card.append(useDirection);
    return card;
  }));
}

function directionStatusLabel(status: CreativeDirection['status']): string {
  return ({
    'next-validation': 'PROVEN ROUTE / 可复用方向',
    planned: 'PLANNED / 待验证',
    'asset-required': 'ASSET REQUIRED / 素材前置'
  })[status];
}

function validateV25ArchiveCards() {
  for (const registration of V25_VERIFIED_DELIVERIES) {
    const card = requiredElement<HTMLAnchorElement>(
      `[data-v25-archive-id="${registration.deliveryId}"]`
    );
    if (card.getAttribute('href') !== registration.route
      || card.dataset.runId !== registration.runId
      || card.dataset.bundleHash !== registration.bundleHash) {
      throw new Error(`V2.5 精选入口与冻结身份不一致：${registration.deliveryId}`);
    }
  }
}

function validateV3ArchiveCards() {
  for (const registration of V3_VERIFIED_DELIVERIES) {
    const card = requiredElement<HTMLAnchorElement>(
      `[data-v3-archive-id="${registration.deliveryId}"]`
    );
    if (card.getAttribute('href') !== registration.route
      || card.dataset.runId !== registration.runId
      || card.dataset.bundleHash !== registration.bundleHash
      || card.dataset.mediumRoute !== registration.mediumRoute) {
      throw new Error(`V3 精选入口与冻结身份或权威媒介不一致：${registration.deliveryId}`);
    }
  }
}

function createExperienceArchiveCard(entry: ExperienceArchiveEntry, position: number) {
  const card = document.createElement('a');
  card.className = 'verified-example-card verified-example-card--research';
  card.href = entry.route;
  card.dataset.exampleId = entry.id;

  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = entry.previewUrl;
  image.alt = `${entry.title}最终验收状态`;
  image.loading = 'lazy';
  image.width = 1440;
  image.height = 900;

  const caption = document.createElement('figcaption');
  caption.append(
    textElement('span', '', `CURATED / ${String(position).padStart(2, '0')}`),
    textElement('strong', '', entry.leadCapability)
  );
  figure.append(image, caption);

  const copy = textElement('div', 'verified-example-copy', '');
  copy.append(
    textElement('span', '', `RESEARCH REFERENCE · ${entry.supportingCapabilities.join(' / ')}`),
    textElement('h3', '', entry.title),
    textElement('p', '', entry.summary)
  );
  const footer = document.createElement('footer');
  footer.append(
    textElement('strong', '', entry.reusableLesson),
    textElement('span', '', '打开研究样例 ↗')
  );
  copy.append(footer);
  card.append(figure, copy);
  return card;
}

function renderBoundedExperienceArchive() {
  const grid = requiredElement<HTMLElement>('.verified-example-grid');
  const existingCards = Array.from(grid.querySelectorAll<HTMLAnchorElement>('[data-example-id]'));
  for (const card of existingCards) {
    card.hidden = true;
    card.removeAttribute('data-experience-archive-id');
    const image = card.querySelector<HTMLImageElement>('img');
    const source = image?.getAttribute('src');
    if (image && source) {
      image.dataset.deferredArchiveSrc = source;
      image.removeAttribute('src');
    }
  }

  const visibleCards = V2_EXPERIENCE_ARCHIVE.map((entry, index) => {
    const card = createExperienceArchiveCard(entry, index + 1);
    const image = card.querySelector<HTMLImageElement>('img');
    card.setAttribute('href', entry.route);
    if (image) {
      image.src = entry.previewUrl;
      image.alt = `${entry.title}最终验收状态`;
      delete image.dataset.deferredArchiveSrc;
    }
    card.hidden = false;
    card.dataset.experienceArchiveId = entry.id;
    card.dataset.experienceArchiveIndex = String(index + 1);
    return card;
  });

  grid.append(...visibleCards);
  document.documentElement.dataset.experienceArchiveReady = 'true';
  document.documentElement.dataset.experienceArchiveCount = String(visibleCards.length);
}

function createFormalProductCard(entry: FormalProductArchiveEntry) {
  const figure = document.createElement('figure');
  figure.className = 'formal-product-media';
  const image = document.createElement('img');
  image.src = entry.previewUrl;
  image.alt = `${entry.title}通过最终浏览器验收的桌面开场`;
  image.loading = 'lazy';
  image.width = 1440;
  image.height = 900;
  figure.append(image);

  const copy = textElement('article', 'formal-product-copy', '');
  copy.append(
    textElement('span', '', 'FORMAL PRODUCT · FINAL IDENTITY BOUND'),
    textElement('h3', '', entry.title),
    textElement('p', '', entry.summary),
    textElement('p', '', entry.productValue)
  );
  const journey = document.createElement('ol');
  journey.className = 'formal-product-journey';
  for (const phase of entry.journey) journey.append(textElement('li', '', phase));
  const link = document.createElement('a');
  link.className = 'formal-product-link';
  link.href = entry.route;
  link.dataset.formalProductId = entry.id;
  link.dataset.runId = entry.runId;
  link.dataset.bundleHash = entry.bundleHash;
  link.append(document.createTextNode('打开完整产品'), textElement('span', '', '↗'));
  copy.append(journey, link);
  return [figure, copy];
}

function renderFormalProductArchive() {
  const grid = requiredElement<HTMLElement>('.formal-product-grid');
  grid.replaceChildren(...V2_FORMAL_PRODUCT_ARCHIVE.flatMap(createFormalProductCard));
  document.documentElement.dataset.formalProductArchiveReady = 'true';
  document.documentElement.dataset.formalProductArchiveCount = String(V2_FORMAL_PRODUCT_ARCHIVE.length);
}

function createAndRender() {
  try {
    render(createV2CreativeContract(ui.brief.value));
  } catch (error) {
    invalidateCurrentContract(
      error instanceof Error ? error.message : '无法生成契约',
      'error'
    );
  }
}

async function copyAuthorPackage() {
  if (contractStale) return;
  const payload = serializeDirectCreativeAuthorPackage(currentPackage);
  let copied = false;
  try {
    await navigator.clipboard.writeText(payload);
    copied = true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = payload;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    copied = document.execCommand('copy');
    textarea.remove();
  }
  ui.copy.dataset.state = copied ? 'copied' : 'error';
  ui.copy.textContent = copied
    ? `已复制有界包 · ${Math.ceil(new TextEncoder().encode(payload).length / 1024)} KB`
    : '复制失败，请重试';
  ui.build.dataset.state = copied ? 'copied' : 'error';
  ui.build.textContent = copied
    ? '有界包已复制 · 在当前 Codex 中粘贴执行'
    : '复制失败 · 请使用上方复制按钮';
  window.setTimeout(() => {
    if (!contractStale) {
      resetCopyActionLabels();
    }
  }, 1800);
}

function resetCopyActionLabels() {
  ui.copy.dataset.state = 'ready';
  ui.copy.textContent = '复制给 Codex 的有界包';
  ui.build.dataset.state = 'ready';
  ui.build.replaceChildren(
    document.createTextNode('复制有界包并交给 Codex '),
    textElement('span', '', '→')
  );
}

document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    const next = examples[button.dataset.example ?? ''];
    if (!next) return;
    ui.brief.value = next;
    createAndRender();
  });
});
ui.plan.addEventListener('click', createAndRender);
ui.brief.addEventListener('input', updateContractFreshness);
ui.copy.addEventListener('click', () => void copyAuthorPackage());
ui.build.addEventListener('click', () => void copyAuthorPackage());

window.__kageV2 = {
  createContract: (brief) => createV2CreativeContract(brief),
  authorPackage: () => currentPackage,
  serializedPackage: () => serializeDirectCreativeAuthorPackage(currentPackage),
  snapshot: () => ({
    contractId: currentContract.id,
    pattern: currentContract.experience.pattern,
    strategy: currentContract.technical.presentationStrategy,
    capabilityId: currentContract.technical.capabilitySelection.capabilityId,
    capabilitySelected: currentContract.technical.capabilitySelection.selected,
    semanticCapabilityId: currentContract.technical.semanticInteraction.capabilityId,
    semanticInteractionSelected: currentContract.technical.semanticInteraction.selected,
    identityCapabilityId: currentContract.technical.identityEvidence.capabilityId,
    identityEvidenceSelected: currentContract.technical.identityEvidence.selected,
    articulatedCapabilityId: currentContract.technical.articulatedSubject.capabilityId,
    articulatedSubjectSelected: currentContract.technical.articulatedSubject.selected,
    audioFeedbackCapabilityId: currentContract.technical.productSemanticFeedback.capabilityId,
    audioFeedbackSelected: currentContract.technical.productSemanticFeedback.selected,
    visualRole: currentContract.direction.visualRole,
    mechanismIds: currentContract.direction.mechanisms.map((mechanism) => mechanism.id),
    rendererRoute: currentContract.direction.renderer.route,
    packageId: currentPackage.packageId,
    directRunId: currentPackage.runSeed.id,
    visualAmbitionLevel: currentPackage.authoringInput.visualAmbition.intentLevel,
    heroTitle: currentPackage.authoringInput.visualAmbition.hero.title,
    authoringBytes: new TextEncoder().encode(serializeDirectCreativeAuthorPackage(currentPackage)).length,
    deadlineAfterMs: currentPackage.timing.deadlineAfterMs,
    wowGateRequired: currentPackage.evidenceRequirements.wowGateRequired,
    baselineVersion: '2.5',
    v25ArchivedDeliveryCount: V25_VERIFIED_DELIVERIES.length,
    creativeProtocolVersion: currentPackage.runSeed.creativeProtocolVersion,
    mediumDecision: currentPackage.authoringInput.mediumDecision.preferred,
    v3ArchivedDeliveryCount: V3_VERIFIED_DELIVERIES.length,
    v3ArchivedDeliveryIds: V3_VERIFIED_DELIVERIES.map((delivery) => delivery.deliveryId),
    v3MediumRoutes: V3_VERIFIED_DELIVERIES.map((delivery) => delivery.mediumRoute),
    effectSelectionPosition: createCodexExecutionBrief(currentContract).creativeDirection.effectQualitySelection.position,
    effectCandidateCount: createCodexExecutionBrief(currentContract).creativeDirection.effectQualitySelection.candidateContract.count,
    techniqueCountScored: createCodexExecutionBrief(currentContract).creativeDirection.effectQualitySelection.evaluation.techniqueCountScored,
    effectSelectionRunState: currentPackage.runSeed.stopReason
      ? 'stopped'
      : currentPackage.runSeed.effectSelectionReceipt
        ? 'selected'
        : 'pending',
    effectSelectionResourcePermission: Boolean(currentPackage.runSeed.effectSelectionReceipt)
      && !currentPackage.runSeed.stopReason,
    stale: contractStale
  })
};

render(currentContract);
renderCreativeDirectionAtlas(creativeDirectionAtlas);
validateV25ArchiveCards();
validateV3ArchiveCards();
renderBoundedExperienceArchive();
renderFormalProductArchive();
document.documentElement.dataset.v2Ready = 'true';
document.documentElement.dataset.v25ArchiveReady = 'true';
document.documentElement.dataset.v3ArchiveReady = 'true';

export {};
