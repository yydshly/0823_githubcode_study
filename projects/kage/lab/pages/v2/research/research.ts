import {
  evaluatePrincipleCombination,
  motionsitesPrinciples,
  motionsitesResearchCases,
  motionsitesSynthesisRecipes,
  type ResearchCase,
  type ResearchCluster,
  type ResearchEvidence,
  type ResearchSurface
} from '../../../src/v2/motionsites-research.ts';
import {
  getActiveResearchTrack,
  getResearchProgramSummary,
  v2ResearchProgram,
  type ResearchSourceFamily,
  type ResearchTrack,
  type ResearchTrackStatus
} from '../../../src/v2/research-program.ts';
import { threejsIrisResearch } from '../../../src/v2/github-exemplar-research.ts';
import {
  externalExcellenceStudies,
  externalImplementationStudies,
  getExternalExcellenceResearchSummary,
  type ExternalExcellenceFamily,
  type ExternalExcellenceStudy,
  type ExternalImplementationStudy
} from '../../../src/v2/external-excellence-research.ts';

declare global {
  interface Window {
    __kageV2Research?: {
      snapshot: () => {
        total: number;
        visible: number;
        selectedId: string | null;
        productionRecipes: number;
        researchTracks: number;
        activeTrackId: string | null;
        completedTracks: number;
        githubExemplars: number;
        externalProductStudies: number;
        externalImplementationStudies: number;
        externalReferenceReady: number;
      };
    };
  }
}

const surfaceLabels: Readonly<Record<ResearchSurface, string>> = {
  catalog: '整页目录',
  sections: '局部组件',
  academy: '官方教程',
  'local-prototype': '本地原型'
};

const clusterLabels: Readonly<Record<ResearchCluster, string>> = {
  'scroll-timeline': '滚动时间轴',
  'spatial-3d': '空间 / 3D',
  'pointer-field': '指针交互',
  'editorial-motion': '编辑动效',
  'asset-led-story': '资产叙事',
  'component-motion': '组件动效',
  'data-interface': '数据界面'
};

const evidenceLabels: Readonly<Record<ResearchEvidence, string>> = {
  E1: '目录线索',
  E2: '通用路线',
  E3: '公开规格',
  E4: '本地验证'
};

const trackStatusLabels: Readonly<Record<ResearchTrackStatus, string>> = {
  active: '正在验证',
  completed: '已总结归档',
  queued: '排队等待',
  blocked: '条件不足'
};

const sourceFamilyLabels: Readonly<Record<ResearchSourceFamily, string>> = {
  motionsites: 'MotionSites',
  'local-html': '本地作品',
  'public-web': '公开网页',
  'github-source': 'GitHub 源码',
  'kage-runtime': 'Kage 运行证据'
};

const externalFamilyLabels: Readonly<Record<ExternalExcellenceFamily, string>> = {
  'editorial-participation': '编辑排版 / 参与式研究',
  'embodied-multimodal-story': '身体化 / 多模态叙事',
  'shared-state-data-tool': '共享状态 / 数据工具',
  'material-product-causality': '材质产品 / 配置因果',
  'audio-visual-instrument': '声音媒体 / 视听乐器',
  'playful-spatial-world': '趣味互动 / 空间世界'
};

const implementationClassificationLabels: Readonly<Record<ExternalImplementationStudy['classification'], string>> = {
  'complete-experience': '完整体验源码',
  'focused-visual-experiment': '聚焦视觉实验',
  'mechanism-infrastructure': '机制基础设施'
};

const implementationRoleLabels: Readonly<Record<ExternalImplementationStudy['referenceRole'], string>> = {
  'direct-experience': '体验与机制并读',
  'principle-only': '仅提炼原则',
  'mechanism-only': '仅研究机制'
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少研究页元素：${selector}`);
  return element;
}

const ui = {
  programStageGoal: requiredElement<HTMLElement>('#program-stage-goal'),
  activeTrackTitle: requiredElement<HTMLElement>('#active-track-title'),
  activeTrackTimebox: requiredElement<HTMLElement>('#active-track-timebox'),
  tracks: requiredElement<HTMLElement>('#research-track-list'),
  coverage: requiredElement<HTMLElement>('#coverage-count'),
  catalogTotal: requiredElement<HTMLElement>('#catalog-total'),
  search: requiredElement<HTMLInputElement>('#case-search'),
  surface: requiredElement<HTMLSelectElement>('#surface-filter'),
  cluster: requiredElement<HTMLSelectElement>('#cluster-filter'),
  evidence: requiredElement<HTMLSelectElement>('#evidence-filter'),
  reset: requiredElement<HTMLButtonElement>('#reset-filters'),
  summary: requiredElement<HTMLElement>('#result-summary'),
  cases: requiredElement<HTMLElement>('#case-list'),
  detail: requiredElement<HTMLElement>('#case-detail'),
  principles: requiredElement<HTMLElement>('#principle-list'),
  recipes: requiredElement<HTMLElement>('#recipe-list'),
  externalStudyCount: requiredElement<HTMLElement>('#external-study-count'),
  externalFamilyCount: requiredElement<HTMLElement>('#external-family-count'),
  externalSourceCount: requiredElement<HTMLElement>('#external-source-count'),
  externalReadyCount: requiredElement<HTMLElement>('#external-ready-count'),
  externalStudies: requiredElement<HTMLElement>('#external-study-list'),
  externalDetail: requiredElement<HTMLElement>('#external-study-detail'),
  implementationStudies: requiredElement<HTMLElement>('#implementation-study-list'),
  githubEvidence: requiredElement<HTMLElement>('#github-study-evidence'),
  githubMeta: requiredElement<HTMLElement>('#github-study-meta'),
  githubName: requiredElement<HTMLElement>('#github-study-name'),
  githubRule: requiredElement<HTMLElement>('#github-study-rule'),
  githubLink: requiredElement<HTMLAnchorElement>('#github-study-link'),
  githubCapabilities: requiredElement<HTMLOListElement>('#github-study-capability-list'),
  githubLimits: requiredElement<HTMLUListElement>('#github-study-limit-list')
};

let selectedId: string | null = motionsitesResearchCases[0]?.id ?? null;
let visibleCases: readonly ResearchCase[] = motionsitesResearchCases;
let selectedExternalId: string | null = externalExcellenceStudies[0]?.id ?? null;

function text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, value: string) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

function appendOptions<T extends string>(
  select: HTMLSelectElement,
  values: readonly T[],
  labels: Readonly<Record<T, string>>
) {
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[value];
    select.append(option);
  });
}

function createTrackList(title: string, items: readonly string[], className = '') {
  const section = document.createElement('section');
  section.className = `track-detail ${className}`.trim();
  const list = document.createElement('ul');
  list.append(...items.map((item) => text('li', '', item)));
  section.append(text('h4', '', title), list);
  return section;
}

function createTrackCard(track: ResearchTrack) {
  const article = document.createElement('article');
  article.className = 'research-track-card';
  article.dataset.status = track.status;
  article.dataset.trackId = track.id;

  const header = document.createElement('header');
  const statusLabel = trackStatusLabels[track.status];
  header.append(
    text('span', 'track-order', `0${track.order}`),
    text('span', 'track-status', `${statusLabel} · ${track.currentEvidence} → ${track.targetEvidence}`)
  );

  const value = document.createElement('div');
  value.className = 'generation-value';
  value.append(text('span', '', '对生成器的直接价值'), text('strong', '', track.generationValue));

  const sources = track.sources.map((source) => (
    `${sourceFamilyLabels[source.family]} / ${source.label} / ${source.evidenceLevel}`
  ));

  article.append(
    header,
    text('h3', '', track.title),
    text('p', 'track-thesis', track.thesis),
    value,
    createTrackList('MODEL GAP / 当前误判', [track.modelDecisionGap], 'track-model-gap'),
    createTrackList('EVIDENCE / 代表证据', sources),
    createTrackList('PROMOTE / 晋级门槛', track.promotionGates),
    createTrackList('STOP / 停止条件', track.stopConditions, 'track-stop')
  );
  return article;
}

function createBulletSection(title: string, items: readonly string[], className = '') {
  const section = document.createElement('section');
  section.className = `external-detail-section ${className}`.trim();
  section.append(text('h4', '', title));
  const list = document.createElement('ul');
  list.append(...items.map((item) => text('li', '', item)));
  section.append(list);
  return section;
}

function createExternalStudyCard(study: ExternalExcellenceStudy, index: number) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'external-study-card';
  button.dataset.selected = String(study.id === selectedExternalId);
  button.dataset.family = study.family;
  button.setAttribute('aria-pressed', String(study.id === selectedExternalId));

  const header = document.createElement('header');
  header.append(
    text('span', '', String(index + 1).padStart(2, '0')),
    text('span', 'external-research-pill', 'RESEARCH-ONLY')
  );
  const transition = document.createElement('div');
  transition.className = 'external-card-transition';
  transition.append(
    text('span', '', study.perceivedTransformation.from),
    text('b', '', '→'),
    text('span', '', study.perceivedTransformation.to)
  );
  const verbs = document.createElement('div');
  verbs.className = 'external-card-verbs';
  verbs.append(...study.interactionVerbs.map((verb) => text('span', '', verb)));
  button.append(
    header,
    text('p', 'external-card-family', externalFamilyLabels[study.family]),
    text('h3', '', study.title),
    text('p', 'external-card-promise', study.experiencePromise),
    transition,
    verbs
  );
  button.addEventListener('click', () => {
    selectedExternalId = study.id;
    renderExternalProductStudies();
    if (window.matchMedia('(max-width: 980px)').matches) {
      ui.externalDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  return button;
}

function renderExternalStudyDetail(study?: ExternalExcellenceStudy) {
  if (!study) {
    ui.externalDetail.replaceChildren(text('p', 'detail-empty', '当前没有可显示的外部产品研究条目。'));
    return;
  }

  const top = document.createElement('div');
  top.className = 'external-detail-topline';
  top.append(
    text('span', '', 'SOURCE-REVIEWED'),
    text('span', 'external-research-pill', study.referenceEligibility.toUpperCase())
  );

  const promise = document.createElement('div');
  promise.className = 'experience-promise';
  promise.append(text('span', '', 'EXPERIENCE PROMISE'), text('strong', '', study.experiencePromise));

  const transformation = document.createElement('div');
  transformation.className = 'transformation-grid';
  const transformationItems: Array<[string, string]> = [
    ['FROM', study.perceivedTransformation.from],
    ['TO', study.perceivedTransformation.to],
    ['TRIGGER', study.perceivedTransformation.trigger],
    ['MEANING', study.perceivedTransformation.meaning]
  ];
  transformation.append(...transformationItems.map(([label, value]) => {
    const item = document.createElement('div');
    item.append(text('span', '', label), text('strong', '', value));
    return item;
  }));

  const media = document.createElement('section');
  media.className = 'external-detail-section';
  media.append(text('h4', '', 'MEDIA RESPONSIBILITIES / 媒介职责'));
  const mediaList = document.createElement('div');
  mediaList.className = 'media-responsibility-list';
  mediaList.append(...study.mediaResponsibilities.map((item) => {
    const row = document.createElement('div');
    row.dataset.necessity = item.necessity;
    row.append(
      text('span', '', `${item.necessity.toUpperCase()} · ${item.medium}`),
      text('p', '', item.responsibility)
    );
    return row;
  }));
  media.append(mediaList);

  const sources = document.createElement('section');
  sources.className = 'external-detail-section external-source-section';
  sources.append(text('h4', '', 'SOURCES / 一手与官方来源'));
  const sourceList = document.createElement('div');
  sourceList.className = 'external-source-list';
  sourceList.append(...study.sources.map((source) => {
    const link = document.createElement('a');
    link.href = source.uri;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.append(
      text('span', '', `${source.evidenceLevel} · ${source.kind.toUpperCase()}`),
      text('strong', '', `${source.title} ↗`),
      text('p', '', source.claim)
    );
    return link;
  }));
  sources.append(sourceList);

  const hypotheses = study.implementationHypotheses.length
    ? createBulletSection('HYPOTHESES / 尚未确认的实现推测', study.implementationHypotheses, 'hypothesis-section')
    : createBulletSection('HYPOTHESES / 尚未确认的实现推测', ['无；当前条目没有把未证实实现写成事实。'], 'hypothesis-section');

  ui.externalDetail.replaceChildren(
    top,
    text('p', 'external-detail-family', externalFamilyLabels[study.family]),
    text('h3', '', study.title),
    text('p', 'first-frame-memory', `首屏记忆：${study.firstFrameMemory}`),
    promise,
    transformation,
    createBulletSection('INTERACTION VERBS / 互动动词', study.interactionVerbs, 'verb-section'),
    media,
    createBulletSection('CONFIRMED MECHANISMS / 已确认机制', study.confirmedMechanisms),
    hypotheses,
    createBulletSection('BORROW / 可借鉴原则', study.borrowPrinciples),
    createBulletSection('NOT APPLICABLE / 不适用边界', study.nonApplicableWhen, 'risk-section'),
    createBulletSection('PROMOTION GATES / 晋级前仍需完成', study.promotionGates, 'promotion-section'),
    sources,
    text('p', 'external-detail-review', `置信度 ${Math.round(study.confidence * 100)}% · 来源审阅 ${study.reviewedAt} · 当前仍为 research-only`)
  );
}

function renderExternalProductStudies() {
  ui.externalStudies.replaceChildren(
    ...externalExcellenceStudies.map(createExternalStudyCard)
  );
  renderExternalStudyDetail(
    externalExcellenceStudies.find((study) => study.id === selectedExternalId)
  );
}

function createImplementationStudyCard(study: ExternalImplementationStudy, index: number) {
  const article = document.createElement('article');
  article.className = 'implementation-study-card';
  article.dataset.role = study.referenceRole;

  const header = document.createElement('header');
  header.append(
    text('span', '', String(index + 1).padStart(2, '0')),
    text('span', 'mechanism-pill', `${study.evidenceLevel} · SOURCE`)
  );

  const boundary = document.createElement('p');
  boundary.className = 'implementation-boundary';
  boundary.textContent = study.referenceRole === 'mechanism-only'
    ? '仅证明机制可研究，不作为视觉作品或直接体验参考。'
    : '源码证据仍不能单独证明视觉成品优秀。';

  const links = document.createElement('div');
  links.className = 'implementation-links';
  const repositoryLink = document.createElement('a');
  repositoryLink.href = study.repositoryUri;
  repositoryLink.target = '_blank';
  repositoryLink.rel = 'noreferrer';
  repositoryLink.textContent = '固定源码 ↗';
  const liveLink = document.createElement('a');
  liveLink.href = study.liveUri;
  liveLink.target = '_blank';
  liveLink.rel = 'noreferrer';
  liveLink.textContent = '运行入口 ↗';
  links.append(repositoryLink, liveLink);

  const applicable = document.createElement('div');
  applicable.className = 'implementation-applicable';
  applicable.append(...study.applicableProducts.map((product) => text('span', '', product)));

  const footer = document.createElement('footer');
  footer.append(
    text('span', '', `REV ${study.reviewedRevision.slice(0, 12)}`),
    text('span', '', `CONF ${Math.round(study.confidence * 100)}%`)
  );

  article.append(
    header,
    text('p', 'implementation-classification', `${implementationClassificationLabels[study.classification]} · ${implementationRoleLabels[study.referenceRole]}`),
    text('h3', '', study.title),
    boundary,
    createBulletSection('CORE MECHANISMS / 已确认机制', study.coreMechanisms, 'implementation-card-section'),
    createBulletSection('BORROW / 只借原则', study.borrowPrinciples, 'implementation-card-section'),
    createBulletSection('RISKS / 许可与产品风险', study.advisoryRisks, 'implementation-card-section risk-section'),
    applicable,
    text('p', 'implementation-license', `许可边界：${study.license}`),
    links,
    footer
  );
  return article;
}

function renderExternalResearch() {
  const summary = getExternalExcellenceResearchSummary();
  ui.externalStudyCount.textContent = String(summary.totalStudies);
  ui.externalFamilyCount.textContent = String(summary.familyCount);
  ui.externalSourceCount.textContent = String(summary.sourceCount);
  ui.externalReadyCount.textContent = String(summary.referenceReadyCount);
  ui.coverage.textContent = String(summary.totalStudies);
  ui.catalogTotal.textContent = String(summary.sourceCount);
  renderExternalProductStudies();
  ui.implementationStudies.replaceChildren(
    ...externalImplementationStudies.map(createImplementationStudyCard)
  );
}

function renderResearchProgram() {
  const activeTrack = getActiveResearchTrack();
  const focusTrack = activeTrack
    ?? v2ResearchProgram.tracks.find((track) => track.status === 'completed')
    ?? v2ResearchProgram.tracks[0];
  ui.programStageGoal.textContent = v2ResearchProgram.stageGoal;
  ui.activeTrackTitle.textContent = focusTrack?.title ?? '暂无研究方向';
  ui.activeTrackTimebox.textContent = activeTrack
    ? `历史节奏：${activeTrack.timeboxDays} 天内晋级或停止`
    : '历史方法已归档 · 不等于 R147 晋级';
  ui.tracks.replaceChildren(...v2ResearchProgram.tracks.map(createTrackCard));
}

function renderGithubStudy() {
  ui.githubEvidence.textContent = `这是历史局部运行证据，不会把 R147 的源码研究自动提升为视觉成品。${threejsIrisResearch.evidenceSummary}`;
  ui.githubMeta.textContent = `LOCAL HISTORY · ${threejsIrisResearch.license} · ${threejsIrisResearch.reviewedCommit.slice(0, 12)}`;
  ui.githubName.textContent = threejsIrisResearch.title;
  ui.githubRule.textContent = `${threejsIrisResearch.selectionRule} ${threejsIrisResearch.rejectionRule}`;
  ui.githubLink.href = threejsIrisResearch.repositoryUrl;
  ui.githubCapabilities.replaceChildren(
    ...threejsIrisResearch.reusableCapabilities.map((item) => text('li', '', item))
  );
  ui.githubLimits.replaceChildren(
    ...threejsIrisResearch.limitations.map((item) => text('li', '', item))
  );
}

function renderDetail(item?: ResearchCase) {
  if (!item) {
    ui.detail.replaceChildren(text('p', 'detail-empty', '当前筛选没有案例。\n重置筛选或换一个研究方向。'));
    return;
  }
  const top = document.createElement('div');
  top.className = 'detail-topline';
  top.append(text('span', '', evidenceLabels[item.evidenceLevel]), text('span', '', item.status.toUpperCase()));
  const heading = text('h3', '', item.title);
  const category = text('p', 'detail-category', `${surfaceLabels[item.sourceSurface]} · ${item.category} · ${item.access}`);
  const link = document.createElement('a');
  link.className = 'detail-source';
  link.href = item.sourceUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = '打开公开来源 ↗';

  const sections: Array<[string, readonly string[]]> = [
    ['OBSERVED / 已确认', item.evidenceBasis],
    ['SIGNALS / 研究方向', item.observedSignals],
    ['IMPLEMENTATION / 可引用事实', item.implementationFacts.length ? item.implementationFacts : ['当前没有足够实现证据；禁止从预览外观推断技术栈。']],
    ['NEXT / 下一证据', item.researchQuestions]
  ];
  const detailSections = sections.map(([title, items]) => {
    const section = document.createElement('section');
    section.className = 'detail-section';
    const list = document.createElement('ul');
    list.append(...items.map((itemText) => text('li', '', itemText)));
    section.append(text('h4', '', title), list);
    return section;
  });
  ui.detail.replaceChildren(top, heading, category, link, ...detailSections);
}

function createCaseCard(item: ResearchCase) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'case-card';
  button.ariaCurrent = String(item.id === selectedId);
  button.dataset.caseId = item.id;
  const meta = document.createElement('div');
  meta.className = 'case-card-meta';
  meta.append(
    text('span', '', surfaceLabels[item.sourceSurface]),
    text('span', 'evidence-pill', item.evidenceLevel === 'E4' ? 'LOCAL · HIST' : item.evidenceLevel)
  );
  button.append(
    meta,
    text('strong', '', item.title),
    text('p', '', `${item.category} · ${item.clusters.map((cluster) => clusterLabels[cluster]).join(' / ')}`)
  );
  button.addEventListener('click', () => {
    selectedId = item.id;
    renderCases();
    renderDetail(item);
    if (window.matchMedia('(max-width: 1120px)').matches) ui.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return button;
}

function renderCases() {
  ui.cases.replaceChildren(...visibleCases.map(createCaseCard));
  ui.summary.textContent = `显示 ${visibleCases.length} / ${motionsitesResearchCases.length} 条历史抽样`;
}

function applyFilters() {
  const query = ui.search.value.trim().toLowerCase();
  visibleCases = motionsitesResearchCases.filter((item) => {
    const haystack = [item.title, item.category, ...item.observedSignals, ...item.clusters].join(' ').toLowerCase();
    return (!query || haystack.includes(query))
      && (ui.surface.value === 'all' || item.sourceSurface === ui.surface.value)
      && (ui.cluster.value === 'all' || item.clusters.includes(ui.cluster.value as ResearchCluster))
      && (ui.evidence.value === 'all' || item.evidenceLevel === ui.evidence.value);
  });
  if (!visibleCases.some((item) => item.id === selectedId)) selectedId = visibleCases[0]?.id ?? null;
  renderCases();
  renderDetail(visibleCases.find((item) => item.id === selectedId));
}

function renderPrinciples() {
  ui.principles.replaceChildren(...motionsitesPrinciples.map((principle) => {
    const article = document.createElement('article');
    article.className = 'principle-card';
    article.dataset.state = principle.state;
    const header = document.createElement('header');
    header.append(text('span', '', `${principle.evidenceLevel} · ${principle.layer.toUpperCase()}`), text('span', '', principle.state.toUpperCase()));
    const footer = document.createElement('footer');
    footer.textContent = `来源：${principle.derivedFrom.join(' / ')} · 验收：${principle.acceptance[0]}`;
    article.append(header, text('h3', '', principle.title), text('p', '', principle.statement), footer);
    return article;
  }));
}

function renderRecipes() {
  ui.recipes.replaceChildren(...motionsitesSynthesisRecipes.map((recipe) => {
    const evaluation = evaluatePrincipleCombination(recipe.principleIds);
    const article = document.createElement('article');
    article.className = 'recipe-card';
    article.dataset.state = recipe.state;
    const header = document.createElement('header');
    header.append(text('span', '', recipe.state.toUpperCase()), text('span', '', `${recipe.evidenceLevel} / ${evaluation.compatible ? 'COMPATIBLE' : 'CONFLICT'}`));
    const principles = document.createElement('div');
    principles.className = 'recipe-principles';
    principles.append(...recipe.principleIds.map((id) => text('span', '', motionsitesPrinciples.find((item) => item.id === id)?.title ?? id)));
    const footer = document.createElement('footer');
    const list = document.createElement('ul');
    list.append(...recipe.guardrails.map((rule) => text('li', '', rule)));
    footer.append(text('strong', '', recipe.resultingCapability), list);
    article.append(header, text('h3', '', recipe.title), text('p', '', recipe.compatibilityRationale), principles, footer);
    return article;
  }));
}

appendOptions(ui.surface, ['catalog', 'sections'], surfaceLabels);
appendOptions(ui.cluster, Object.keys(clusterLabels) as ResearchCluster[], clusterLabels);
appendOptions(ui.evidence, ['E1', 'E2', 'E3', 'E4'], evidenceLabels);

ui.search.addEventListener('input', applyFilters);
ui.surface.addEventListener('change', applyFilters);
ui.cluster.addEventListener('change', applyFilters);
ui.evidence.addEventListener('change', applyFilters);
ui.reset.addEventListener('click', () => {
  ui.search.value = '';
  ui.surface.value = 'all';
  ui.cluster.value = 'all';
  ui.evidence.value = 'all';
  applyFilters();
});

window.__kageV2Research = {
  snapshot: () => {
    const programSummary = getResearchProgramSummary();
    return {
      total: motionsitesResearchCases.length,
      visible: visibleCases.length,
      selectedId,
      productionRecipes: motionsitesSynthesisRecipes.filter((recipe) => recipe.state === 'validated').length,
      researchTracks: programSummary.totalTracks,
      activeTrackId: programSummary.activeTrackId,
      completedTracks: programSummary.completedTrackIds.length,
      githubExemplars: 1,
      externalProductStudies: externalExcellenceStudies.length,
      externalImplementationStudies: externalImplementationStudies.length,
      externalReferenceReady: getExternalExcellenceResearchSummary().referenceReadyCount
    };
  }
};

renderExternalResearch();
renderResearchProgram();
renderGithubStudy();
renderCases();
renderDetail(motionsitesResearchCases.find((item) => item.id === selectedId));
renderPrinciples();
renderRecipes();
document.documentElement.dataset.v2ResearchReady = 'true';

export {};
