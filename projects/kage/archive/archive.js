const state = { manifest: null, caseQuery: '', caseFilter: 'all', historyQuery: '', docQuery: '' };

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function renderStats(manifest) {
  Object.entries(manifest.stats).forEach(([key, value]) => {
    const node = document.querySelector(`[data-stat="${key}"]`);
    if (node) node.textContent = value;
  });
  $('#archive-provenance').textContent = `${manifest.archiveDate} · ${manifest.sourceBranch} · ${manifest.sourceCommit.slice(0, 7)}`;
}

function renderPhases(phases) {
  $('#phase-list').innerHTML = phases.map((phase) => `
    <li>
      <h3>${esc(phase.title)}</h3>
      <p>${esc(phase.summary)}</p>
      <time>${esc(phase.range)}</time>
    </li>`).join('');
}

function renderCapabilities(capabilities) {
  $('#capability-list').innerHTML = capabilities.map((item, index) => `
    <article class="capability-card">
      <span>CAP ${String(index + 1).padStart(2, '0')}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.lesson)}</p>
      <ul>${item.media.map((value) => `<li>${esc(value)}</li>`).join('')}</ul>
    </article>`).join('');
}

function renderFeatured(cases) {
  const featured = cases.filter((item) => item.image);
  $('#featured-cases').innerHTML = featured.map((item) => `
    <article class="featured-card">
      <img src="./assets/${encodeURIComponent(item.image)}" alt="${esc(item.title)} 案例预览" loading="lazy" />
      <div><span>${esc(item.tierLabel)} · ${esc(item.medium)}</span><h3>${esc(item.title)}</h3><p>${esc(item.promise)}</p><a data-case-view href="${esc(item.viewUrl)}">查看案例 ↗</a></div>
    </article>`).join('');
}

function renderCaseFilters(cases) {
  const select = $('#case-filter');
  [...new Set(cases.map((item) => item.tier))].forEach((tier) => {
    const item = cases.find((entry) => entry.tier === tier);
    select.insertAdjacentHTML('beforeend', `<option value="${esc(tier)}">${esc(item.tierLabel)}</option>`);
  });
}

function renderCases() {
  const query = state.caseQuery.trim().toLowerCase();
  const cases = state.manifest.cases.filter((item) => {
    const matchesQuery = !query || [item.id, item.title, item.promise, item.medium, item.tierLabel].join(' ').toLowerCase().includes(query);
    const matchesTier = state.caseFilter === 'all' || item.tier === state.caseFilter;
    return matchesQuery && matchesTier;
  });
  $('#case-count').textContent = `${cases.length} / ${state.manifest.cases.length}`;
  $('#case-catalog').innerHTML = cases.length ? cases.map((item, index) => `
    <article class="case-row">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <a class="case-thumb" data-case-view href="${esc(item.viewUrl)}" aria-label="查看 ${esc(item.title)}">
        <img src="./assets/${encodeURI(item.thumbnail)}" alt="${esc(item.title)} 案例封面" loading="lazy" />
      </a>
      <div><h3>${esc(item.title)}</h3><p>${esc(item.tierLabel)} · ${esc(item.medium)}<br />${esc(item.promise)}</p></div>
      <div class="case-actions"><a data-case-view href="${esc(item.viewUrl)}">查看案例 ↗</a><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">源码</a></div>
    </article>`).join('') : '<p class="empty">没有匹配的案例。</p>';
}

function renderHistory() {
  const query = state.historyQuery.trim().toLowerCase();
  const runs = state.manifest.generatedHistory.filter((item) => !query || [item.id, item.title, item.stateLabel].join(' ').toLowerCase().includes(query));
  $('#history-count').textContent = `${runs.length} / ${state.manifest.generatedHistory.length}`;
  $('#history-list').innerHTML = runs.length ? runs.map((item, index) => `
    <article class="history-row">
      <span>${String(index + 1).padStart(3, '0')}</span>
      <div><h3>${esc(item.title)}</h3><p>${esc(item.id)}</p></div>
      <div class="history-flags"><small>${esc(item.stateLabel)}</small><small>${item.hasBundle ? 'bundle' : '未完成'}</small>${item.hasReview ? '<small>有评审</small>' : ''}${item.archivedPackage ? '<small>已冻结包</small>' : ''}</div>
      <a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">查看记录 ↗</a>
    </article>`).join('') : '<p class="empty">没有匹配的生成记录。</p>';
}

function renderSourceFamilies(families) {
  $('#source-family-list').innerHTML = families.map((item, index) => `
    <article class="source-family"><span>SRC ${String(index + 1).padStart(2, '0')}</span><h3>${esc(item.title)}</h3><p>${esc(item.finding)}</p></article>`).join('');
}

function renderDocuments() {
  const query = state.docQuery.trim().toLowerCase();
  const documents = state.manifest.researchDocuments.filter((item) => !query || item.name.toLowerCase().includes(query));
  $('#doc-count').textContent = `${documents.length} / ${state.manifest.researchDocuments.length}`;
  $('#document-list').innerHTML = documents.length ? documents.map((item, index) => `
    <div class="document-row"><span>${String(index + 1).padStart(3, '0')}</span><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.name)}</a><small>${esc(item.family)}</small></div>`).join('') : '<p class="empty">没有匹配的研究文档。</p>';
}

async function start() {
  try {
    const response = await fetch('./research-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`manifest ${response.status}`);
    state.manifest = await response.json();
    renderStats(state.manifest);
    renderPhases(state.manifest.phases);
    renderCapabilities(state.manifest.capabilities);
    renderFeatured(state.manifest.cases);
    renderCaseFilters(state.manifest.cases);
    renderCases();
    renderHistory();
    renderSourceFamilies(state.manifest.sourceFamilies);
    renderDocuments();

    $('#case-search').addEventListener('input', (event) => { state.caseQuery = event.target.value; renderCases(); });
    $('#case-filter').addEventListener('change', (event) => { state.caseFilter = event.target.value; renderCases(); });
    $('#history-search').addEventListener('input', (event) => { state.historyQuery = event.target.value; renderHistory(); });
    $('#doc-search').addEventListener('input', (event) => { state.docQuery = event.target.value; renderDocuments(); });
  } catch (error) {
    document.body.insertAdjacentHTML('afterbegin', `<p class="empty">归档清单读取失败：${esc(error.message)}</p>`);
  }
}

start();
