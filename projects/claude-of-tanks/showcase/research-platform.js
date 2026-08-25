import '/@cot-research/research-platform.css';
import {
  RESEARCH_PLATFORM_VERSION,
  platformGoal,
  layers,
  demos,
  performanceBudgets,
  risks,
  budgetStatus,
  auditRegistry,
} from '/@cot-research/research-platform-registry.js';

const root = document.getElementById('research-platform');
const startedAt = performance.now();
const audit = auditRegistry();

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatMetric = (metric) => {
  if (metric.unit === 'ms' && metric.value >= 1000) return `${(metric.value / 1000).toFixed(1)}s`;
  return `${metric.value}${metric.unit === 'count' ? '' : ` ${metric.unit}`}`;
};

const layerCards = layers.map((layer) => `
  <article class="layer-card" data-layer-id="${esc(layer.id)}">
    <div class="layer-order">0${layer.order} / ${esc(layer.reusable)} reuse</div>
    <h3>${esc(layer.label)}</h3>
    <p>${esc(layer.description)}</p>
    <div style="margin-top:16px"><span class="status ${esc(layer.status)}">${esc(layer.status)}</span></div>
  </article>
`).join('');

const demoCards = demos.map((demo) => {
  const subjectComposition = [demo.subject, ...(demo.alternateSubjects || [])].join(' ↔ ');
  const proofItems = demo.proves.map((item) => `<li>${esc(item)}</li>`).join('');
  const action = demo.status === 'blocked'
    ? `<div class="disabled-action" aria-disabled="true">已阻止启动 · ${esc(demo.blocker)}</div>`
    : `<a class="action" data-demo-link="${esc(demo.id)}" href="${esc(demo.route)}">打开演示</a>`;
  return `
    <article class="demo-card ${demo.status === 'blocked' ? 'blocked' : ''}" data-demo-id="${esc(demo.id)}">
      <div><span class="status ${esc(demo.status)}">${esc(demo.status)}</span></div>
      <h3>${esc(demo.label)}</h3>
      <div class="composition">${esc(demo.scene)} + ${esc(subjectComposition)} + ${esc(demo.presentation)}</div>
      <p>${demo.status === 'blocked' ? esc(demo.blocker) : `这个入口只证明：${esc(demo.proves.join('、'))}。`}</p>
      <ul class="proof-list">${proofItems}</ul>
      ${action}
    </article>
  `;
}).join('');

const metricRows = performanceBudgets.map((metric) => {
  const status = budgetStatus(metric);
  const ratio = Math.min(1, metric.value / metric.target);
  return `
    <article class="metric ${status}" data-budget-id="${esc(metric.id)}" data-budget-status="${status}">
      <div class="metric-row">
        <span>${esc(metric.label)}</span>
        <strong>${esc(formatMetric(metric))}</strong>
      </div>
      <div class="metric-track" aria-hidden="true"><div class="metric-fill" style="width:${Math.max(0.04, ratio) * 100}%"></div></div>
      <small>目标 ≤ ${esc(formatMetric({ ...metric, value: metric.target }))}${metric.caveat ? ` · ${esc(metric.caveat)}` : ''}</small>
    </article>
  `;
}).join('');

const riskRows = risks.map((risk) => `
  <article class="risk ${esc(risk.severity)}" data-risk-id="${esc(risk.id)}">
    <div class="risk-row">
      <h4>${esc(risk.label)}</h4>
      <span class="risk-severity">${esc(risk.severity)}</span>
    </div>
    <p>${esc(risk.detail)}</p>
    <small>处理方向：${esc(risk.mitigation)}</small>
  </article>
`).join('');

root.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">COT / 3D RESEARCH PLATFORM</div>
      <nav class="topnav" aria-label="项目入口">
        <a href="/">原游戏</a>
        <a href="/gallery?id=t90m">Gallery</a>
        <a href="/docs">工程文档</a>
        <a href="/research/archive">阶段归档</a>
      </nav>
    </header>

    <section class="hero">
      <div>
        <span class="eyebrow">Capability map · Runtime evidence · Reuse boundary</span>
        <h1>${esc(platformGoal.title)}</h1>
        <p>${esc(platformGoal.statement)}</p>
      </div>
      <div class="hero-facts" aria-label="研究平台摘要">
        <div class="hero-fact"><strong>${layers.length}</strong><span>能力层</span></div>
        <div class="hero-fact"><strong>${demos.filter((demo) => demo.status !== 'blocked').length}</strong><span>可启动演示</span></div>
        <div class="hero-fact"><strong>${audit.counts.budgetsOver}</strong><span>超预算指标</span></div>
        <div class="hero-fact"><strong>${risks.filter((risk) => risk.severity === 'high').length}</strong><span>高风险项</span></div>
      </div>
    </section>

    <section class="section" id="architecture">
      <div class="section-head">
        <div><span class="section-label">Architecture boundary</span><h2>先分层，再组合</h2></div>
        <p class="section-note">展台属于展示逻辑，沙漠属于场景逻辑。组合必须显式声明，任何失败组合都不能冒充正式能力。</p>
      </div>
      <div class="layer-grid">${layerCards}</div>
    </section>

    <section class="section" id="demos">
      <div class="section-head">
        <div><span class="section-label">Evidence routes</span><h2>正式演示与失败证据</h2></div>
        <p class="section-note">稳定入口可以启动；blocked 入口只保留结论，没有“打开演示”链接。</p>
      </div>
      <div class="demo-grid">${demoCards}</div>
    </section>

    <section class="section split" id="performance">
      <div class="panel">
        <span class="section-label">Performance budgets</span>
        <h3>性能预算不是平均分</h3>
        <div class="metric-list">${metricRows}</div>
      </div>
      <div class="panel">
        <span class="section-label">Risk register</span>
        <h3>当前复用风险</h3>
        <div class="risk-list">${riskRows}</div>
      </div>
    </section>

    <section class="section" id="reuse">
      <div class="section-head">
        <div><span class="section-label">Reuse decision</span><h2>哪些能复用，哪些还不能</h2></div>
      </div>
      <div class="panel">
        <table class="reuse-table">
          <thead><tr><th>结论</th><th>能力</th><th>当前判断</th></tr></thead>
          <tbody>
            <tr><td><span class="status proven">可复用</span></td><td>独立 Renderer、world:none SceneProfile、SubjectAdapter v1、热点/材质/分解/跨主体导演</td><td>产品工作台已有独立浏览器证据；坦克 Studio 与七层实验继续保留。</td></tr>
            <tr><td><span class="status partial">需提取</span></td><td>共享 SceneProfile 生命周期、外部 GLB 适配、统一 PresentationProfile</td><td>轻量工作台已解耦，但主游戏 Studio 仍会创建完整 world。</td></tr>
            <tr><td><span class="status blocked">不能声称</span></td><td>商业级产品资产、完整室内展厅、任意 GLB 自动接入、移动端生产就绪</td><td>程序化主体只是 L2 原型；仍缺真实资产质量门和设备级性能基准。</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer class="footer">
      Registry v${RESEARCH_PLATFORM_VERSION} · 审计 ${audit.pass ? 'PASS' : 'FAIL'} · 本页面是轻量 DOM 控制面，不加载 Three.js world；3D 能力必须在对应证据入口中验证。
    </footer>
  </div>
`;

root.setAttribute('aria-busy', 'false');
root.dataset.platformReady = 'true';

await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const navigation = performance.getEntriesByType('navigation')[0];
const runtime = {
  version: RESEARCH_PLATFORM_VERSION,
  status: audit.pass ? 'ready' : 'error',
  audit,
  hubReadyMs: Math.round(performance.now() - startedAt),
  domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
  loadEventMs: navigation ? Math.round(navigation.loadEventEnd) : null,
  threeRuntimeLoaded: Boolean(window.THREE || window.__GAME_READY || window.__STUDIO),
  blockedDemoHasLink: Boolean(document.querySelector('[data-demo-id="industrial-showroom-experiment"] a')),
  dispose() {
    root.replaceChildren();
    delete window.__COT_RESEARCH_PLATFORM;
  },
};

window.__COT_RESEARCH_PLATFORM = runtime;
