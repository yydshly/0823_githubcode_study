import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const htmlPath = path.join(root, "docs/projects/hyperframes-launches.html");
const cssPath = path.join(root, "docs/hyperframes.css");
let html = (await readFile(htmlPath, "utf8")).replace(/\r\n/g, "\n");
let css = (await readFile(cssPath, "utf8")).replace(/\r\n/g, "\n");

if (html.includes('id="complex-demo"')) {
  console.log("Complex demo already present; no HTML changes needed.");
} else {
  const replacements = [
    ['<meta name="description" content="HyperFrames Launches 页面内直接视频演示：真实 MP4 成片、25个可运行入口、HTML原生视频架构、运行证据与扩展路线。">', '<meta name="description" content="HyperFrames Launches 页面内直接视频演示：28 支真实 MP4、AI 内容视频工厂复杂实战、VideoSpec、批量变量、运行证据与扩展路线。">'],
    ['        <a href="#direct-demos">快速看能力</a>\n        <a href="#all-showcases">19 个完整样例</a>\n        <a href="https://github.com/yydshly/0823_githubcode_study/tree/main/projects/hyperframes-launches">研究文件</a>', '        <a href="#direct-demos">快速看能力</a>\n        <a href="#complex-demo">复杂目标实战</a>\n        <a href="#all-showcases">19 个完整样例</a>'],
    ['              <a class="primary-action" href="#direct-demos">先看 6 支能力片段</a>\n              <a href="#all-showcases">直接看 19 个项目</a>', '              <a class="primary-action" href="#complex-demo">看复杂目标怎样落地</a>\n              <a href="#direct-demos">先看 6 支能力片段</a>\n              <a href="#all-showcases">直接看 19 个项目</a>'],
    ['          <div><strong>26</strong><span>IN-PAGE VIDEO DEMOS</span></div>\n          <div><strong>25</strong><span>RUNNABLE ENTRIES</span></div>\n          <div><strong>181</strong><span>HTML FILES</span></div>', '          <div><strong>28</strong><span>IN-PAGE VIDEO DEMOS</span></div>\n          <div><strong>26</strong><span>RUNNABLE ENTRIES</span></div>\n          <div><strong>182</strong><span>HTML FILES</span></div>'],
  ];
  for (const [before, after] of replacements) {
    const count = html.split(before).length - 1;
    if (count !== 1) throw new Error(`Expected one HTML replacement match, found ${count}: ${before.slice(0, 80)}`);
    html = html.replace(before, after);
  }

  const section = String.raw`      <section id="complex-demo" class="research-section complex-goal-section" aria-labelledby="complex-demo-title">
        <div class="section-kicker">04 / 复杂目标实战</div>
        <div class="section-content">
          <div class="complex-goal-banner">
            <div>
              <p class="eyebrow">REAL BUILD · ONE TEMPLATE → MANY VIDEOS</p>
              <h2 id="complex-demo-title">建设一个 AI 内容视频工厂。</h2>
              <p>目标不是“做一支漂亮视频”，而是把每天变化的数据稳定变成可发布成片：结构只建设一次，标题、数字、洞察、来源、渠道和品牌主题按每条任务自动替换。</p>
            </div>
            <dl>
              <div><dt>固定资产</dt><dd>镜头、版式、动画、质量门</dd></div>
              <div><dt>变化输入</dt><dd>VideoSpec 业务数据</dd></div>
              <div><dt>最终输出</dt><dd>多主题、多客户、多渠道 MP4</dd></div>
            </dl>
          </div>

          <div class="complex-when-grid" aria-label="何时使用 HyperFrames">
            <article><span>适合什么时候</span><h3>内容重复生产，视觉结构需要稳定</h3><p>AI 日报、产品周报、版本发布、客户专属介绍、多语言本地化、数据榜单和社交媒体系列。</p></article>
            <article><span>它在链路中的位置</span><h3>位于内容系统的“成片末端”</h3><p>上游负责采集、事实校验和写稿；HyperFrames 负责把已确认信息变成确定性画面并渲染。</p></article>
            <article><span>不适合替代什么</span><h3>不是自由生成式电影模型</h3><p>它不替代实拍、写实人物生成或开放式镜头创作；它擅长可控、可复用、可审计的视频工程。</p></article>
          </div>

          <div class="complex-pipeline" aria-label="AI 内容视频工厂流水线">
            <div><span>01</span><strong>采集与校验</strong><small>feeds / API / 人审</small></div>
            <i aria-hidden="true">→</i>
            <div><span>02</span><strong>生成 VideoSpec</strong><small>只描述业务内容</small></div>
            <i aria-hidden="true">→</i>
            <div><span>03</span><strong>场景路由</strong><small>字段映射到镜头</small></div>
            <i aria-hidden="true">→</i>
            <div><span>04</span><strong>批量渲染</strong><small>HTML → 逐帧 → MP4</small></div>
            <i aria-hidden="true">→</i>
            <div><span>05</span><strong>质量门与发布</strong><small>版式 / 黑帧 / 渠道</small></div>
          </div>

          <div class="complex-demo-layout">
            <article class="spec-panel">
              <div class="panel-heading"><span>实际输入</span><code>video-spec.example.json</code></div>
              <pre><code>{
  "content": {
    "title": "今日 AI 信号",
    "metric": "12",
    "insight": "多模态 Agent 走向工作流"
  },
  "evidence": [
    "MODEL LAB", "PRODUCT LOG", "DEV SIGNAL"
  ],
  "distribution": ["团队晨会", "知识库", "社交媒体"],
  "theme": { "accent": "#a7ff4f" }
}</code></pre>
              <p><strong>关键点：</strong>业务系统只填内容字段，不需要知道第 127 帧怎么动。镜头和动画由模板团队维护。</p>
            </article>

            <div class="complex-film-grid" aria-label="同一模板的两支真实批量成片">
              <article class="showcase-card complex-film-card">
                <div class="showcase-media">
                  <video data-autoplay-demo="viewport" muted data-play-once playsinline controls preload="none" poster="../assets/hyperframes/complex/ai-daily.jpg?v=director-cut-2" aria-label="AI 日报变量版完整成片">
                    <source data-src="../assets/hyperframes/complex/ai-daily.mp4?v=director-cut-2" type="video/mp4">
                  </video>
                  <span>18 SEC · HIGH 1080P · PLAY ONCE</span>
                </div>
                <div class="showcase-copy"><small>ROW 01 · DIRECTOR CUT · GREEN</small><h3>AI 日报版</h3><p>标题、12 条更新、洞察、三类来源、分发渠道与绿色主题均来自第一行变量。</p><a href="../assets/hyperframes/complex/batch.json">查看变量文件</a></div>
              </article>
              <article class="showcase-card complex-film-card">
                <div class="showcase-media">
                  <video data-autoplay-demo="viewport" muted data-play-once playsinline controls preload="none" poster="../assets/hyperframes/complex/product-update.jpg?v=director-cut-2" aria-label="产品更新变量版完整成片">
                    <source data-src="../assets/hyperframes/complex/product-update.mp4?v=director-cut-2" type="video/mp4">
                  </video>
                  <span>18 SEC · HIGH 1080P · PLAY ONCE</span>
                </div>
                <div class="showcase-copy"><small>ROW 02 · DIRECTOR CUT · BLUE</small><h3>产品更新版</h3><p>没有复制模板，只把第二行变量换成 3 项能力、发布洞察、客户渠道与蓝色主题。</p><a href="../assets/hyperframes/complex/template-source.html.txt">查看模板源码</a></div>
              </article>
            </div>
          </div>

          <div class="variable-proof">
            <div class="panel-heading"><span>同一模板，什么发生了变化</span><code>batch.json → 2 outputs</code></div>
            <div class="variable-table" role="table" aria-label="两支成片变量对比">
              <div role="row" class="table-head"><span role="columnheader">字段</span><span role="columnheader">AI 日报版</span><span role="columnheader">产品更新版</span><span role="columnheader">影响镜头</span></div>
              <div role="row"><strong role="cell">title</strong><span role="cell">今日 AI 信号</span><span role="cell">产品更新速报</span><em role="cell">输入镜头 + 主标题</em></div>
              <div role="row"><strong role="cell">metric</strong><span role="cell">12 条可信更新</span><span role="cell">3 项关键能力</span><em role="cell">证据镜头</em></div>
              <div role="row"><strong role="cell">evidence</strong><span role="cell">研究 / 产品 / 开发</span><span role="cell">日志 / 价值 / QA</span><em role="cell">来源标签</em></div>
              <div role="row"><strong role="cell">theme</strong><span role="cell">荧光绿色</span><span role="cell">发布蓝色</span><em role="cell">全片品牌视觉</em></div>
              <div role="row"><strong role="cell">distribution</strong><span role="cell">晨会 / 知识库 / 社媒</span><span role="cell">客户群 / 日志 / 主页</span><em role="cell">发布镜头</em></div>
            </div>
          </div>

          <div class="complex-howto">
            <div>
              <span class="howto-number">01</span><h3>现在如何使用</h3>
              <pre><code>cd E:\0823_codex_project\projects\hyperframes-launches\examples\ai-content-video-factory
.\render-demo.ps1

# 结果
renders\ai-daily.mp4
renders\product-update.mp4</code></pre>
            </div>
            <div>
              <span class="howto-number">02</span><h3>如何新增第三支</h3>
              <p>复制 <code>batch.json</code> 中一行，修改标题、数字、洞察、来源、渠道与主题色，再运行同一命令。无需复制或编辑时间轴。</p>
              <pre><code>npx hyperframes render \
  --batch batch.json \
  --output "renders/{name}.mp4" \
  --strict-variables .</code></pre>
            </div>
          </div>

          <div class="extension-levels">
            <article><span>LEVEL 1</span><h3>连接真实内容</h3><p>把新闻源、产品 Changelog、数据库或表单转成 VideoSpec；增加事实校验和人工审批。</p><strong>从手填 JSON 到每日自动输入</strong></article>
            <article><span>LEVEL 2</span><h3>建设镜头组件库</h3><p>增加人物卡、引用、图表、时间线、网页录屏、字幕、旁白和品牌收尾，并按内容类型路由。</p><strong>从一套模板到一组场景资产</strong></article>
            <article><span>LEVEL 3</span><h3>多版本与质量门</h3><p>批量生成横屏、竖屏、多语言和多客户版本；自动检查溢出、黑帧、字幕、音量与来源。</p><strong>从能生成到稳定交付</strong></article>
            <article><span>LEVEL 4</span><h3>生产平台</h3><p>接入队列、云渲染、制品存储、成本追踪、审批状态与渠道发布，形成完整视频工厂。</p><strong>从脚本到可运营系统</strong></article>
          </div>

          <p class="complex-conclusion"><strong>这对你的意义：</strong>你不再为每条内容“重新做视频”，而是在建设一条可复用的表达能力。内容越多、版本越多、品牌约束越强，HyperFrames 的价值越大。</p>
        </div>
      </section>

`;
  const anchor = '      <section id="all-showcases" class="research-section showcase-section" aria-labelledby="cases-title">';
  if (!html.includes(anchor)) throw new Error("Could not find all-showcases insertion anchor.");
  html = html.replace(anchor, section + anchor);

  const renumber = [
    ['<div class="section-kicker">04 / 全量样例墙</div>', '<div class="section-kicker">05 / 全量样例墙</div>'],
    ['<div class="section-kicker">05 / 证据</div>', '<div class="section-kicker">06 / 证据</div>'],
    ['<div class="section-kicker">06 / 使用</div>', '<div class="section-kicker">07 / 使用</div>'],
    ['<div class="section-kicker">07 / 扩展</div>', '<div class="section-kicker">08 / 扩展</div>'],
    ['<div><strong>0</strong><span>代表模板运行时与布局错误</span></div>\n            <div><strong>325</strong><span>实际捕获并编码的视频帧</span></div>', '<div><strong>0</strong><span>复杂模板 Lint 错误与警告</span></div>\n            <div><strong>1008</strong><span>双版本实际捕获视频帧</span></div>'],
    ['首屏 10.8 秒主演示来自本机实际渲染；其余 6 支片段来自上游仓库的真实 MP4。代表模板完成 9 个布局采样、动效检查、11/11 WCAG AA 对比度检查。其余 14 个入口反映上游跨版本迁移成本，我们保留原始证据，不直接修改 submodule。', '首屏主演示、6 支能力片段、19 个项目预览与上方 2 支变量版成片都在页面内直接播放。复杂模板通过 HyperFrames Lint（0 错误、0 警告），批处理清单记录 2/2 成功、每支 504 帧。上游不兼容入口仍保留原始证据，不直接修改 submodule。'],
    ['<h2 id="next-title">先改一个 10 秒模板，再建自动化系统。</h2>\n        <p>从 `01-ui-sting` 替换品牌与故事，跑通 preview → check → render。确认视觉路线后，再抽象 VideoSpec 和新闻场景组件，避免过早建设一套没有成片反馈的复杂平台。</p>', '<h2 id="next-title">先把真实内容接进这套复杂模板。</h2>\n        <p>当前已经跑通 VideoSpec → 六镜头模板 → 双变量批量渲染 → 页面成片。下一步最有价值的是接入一条真实数据源，并增加事实审批、旁白字幕和自动质量门。</p>'],
    ['          <a href="https://github.com/yydshly/0823_githubcode_study/tree/main/projects/hyperframes-launches">查看中文指南</a>\n          <a href="https://github.com/heygen-com/hyperframes-launches/tree/main/heygen-apple-motion/01-ui-sting">查看起步模板</a>', '          <a href="#complex-demo">回看复杂实战</a>\n          <a href="https://github.com/heygen-com/hyperframes-launches">查看 HyperFrames 上游</a>'],
  ];
  for (const [before, after] of renumber) {
    const count = html.split(before).length - 1;
    if (count !== 1) throw new Error(`Expected one renumber match, found ${count}: ${before.slice(0, 80)}`);
    html = html.replace(before, after);
  }
}

const cssMarker = "/* Complex AI content video factory */";
if (!css.includes(cssMarker)) {
  css += `

${cssMarker}
.complex-goal-section .section-content { min-width: 0; max-width: none; }
.complex-goal-banner { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, .55fr); gap: 52px; padding: clamp(28px, 4vw, 52px); border: 1px solid #405441; border-radius: 18px; background: radial-gradient(circle at 88% 8%, rgba(167,240,111,.13), transparent 32%), #0b110d; }
.complex-goal-banner h2 { max-width: 840px; margin: 14px 0 22px; font-size: clamp(42px, 5.5vw, 78px); line-height: .98; letter-spacing: -.055em; }
.complex-goal-banner p:not(.eyebrow) { max-width: 790px; margin: 0; color: #aab7ad; font-size: 16px; line-height: 1.75; }
.complex-goal-banner dl { display: grid; align-content: start; gap: 1px; margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: var(--line); }
.complex-goal-banner dl div { padding: 18px 20px; background: rgba(12,19,14,.94); }
.complex-goal-banner dt { color: var(--accent); font: 700 9px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .1em; }
.complex-goal-banner dd { margin: 9px 0 0; color: #e4ebe5; font-size: 13px; line-height: 1.5; }
.complex-when-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.complex-when-grid article { min-height: 210px; padding: 25px; border: 1px solid var(--line); border-radius: 13px; background: var(--panel); }
.complex-when-grid span, .extension-levels span { color: var(--accent); font: 700 9px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .1em; }
.complex-when-grid h3 { margin: 38px 0 11px; font-size: 20px; line-height: 1.35; }
.complex-when-grid p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.65; }
.complex-pipeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr) 30px) minmax(0, 1fr); gap: 6px; margin-top: 42px; align-items: center; }
.complex-pipeline div { min-height: 126px; padding: 19px; border: 1px solid var(--line); border-radius: 11px; background: #0b100d; }
.complex-pipeline span { color: var(--accent); font: 700 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
.complex-pipeline strong { display: block; margin-top: 28px; font-size: 15px; }
.complex-pipeline small { display: block; margin-top: 7px; color: #7f8c82; font-size: 10px; }
.complex-pipeline i { color: var(--accent); text-align: center; font-style: normal; }
.complex-demo-layout { display: block; min-width: 0; margin-top: 44px; }
.spec-panel, .variable-proof { width: 100%; min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 13px; background: #090d0a; }
.spec-panel { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(270px, .75fr); }
+.panel-heading { display: flex; gap: 18px; padding: 16px 19px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); color: #e4ece5; font-size: 12px; font-weight: 700; }
.panel-heading code { color: var(--accent); font: 600 10px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
.spec-panel .panel-heading { grid-column: 1 / -1; }
+.spec-panel pre { width: 100%; min-width: 0; margin: 0; padding: 24px 20px 18px; overflow-x: auto; color: #cfe0d2; font: 500 11px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace; }
.spec-panel > p { display: flex; margin: 0; padding: 24px; align-items: center; border-left: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.65; }
.spec-panel > p strong { color: var(--accent); }
.complex-film-grid { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr); gap: 22px; margin-top: 18px; }
.complex-film-card { min-width: 0; }
.complex-film-card .showcase-copy { min-height: 210px; }
.variable-proof { margin-top: 16px; }
.variable-table > div { display: grid; grid-template-columns: .65fr 1fr 1fr .85fr; gap: 16px; padding: 15px 20px; align-items: center; border-top: 1px solid rgba(255,255,255,.065); }
.variable-table > div:first-child { border-top: 0; }
.variable-table .table-head { color: #859188; font: 700 9px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .08em; }
.variable-table strong { color: var(--accent); font: 700 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
.variable-table span, .variable-table em { color: #c5d0c7; font-size: 12px; font-style: normal; line-height: 1.45; }
.variable-table em { color: #7f8e83; }
.complex-howto { display: grid; min-width: 0; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 44px; }
.complex-howto > div { min-width: 0; padding: 25px; border: 1px solid var(--line); border-radius: 13px; background: var(--panel); }
.howto-number { color: var(--accent); font: 700 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
.complex-howto h3 { margin: 26px 0 15px; font-size: 22px; }
.complex-howto p { min-height: 64px; color: var(--muted); font-size: 13px; line-height: 1.65; }
.complex-howto pre { width: 100%; min-width: 0; margin: 0; padding: 17px; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: #080b09; color: #d5e3d7; font: 500 10px/1.7 ui-monospace, SFMono-Regular, Consolas, monospace; }
.extension-levels { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 16px; overflow: hidden; border: 1px solid var(--line); border-radius: 13px; background: var(--line); }
.extension-levels article { display: flex; min-height: 275px; padding: 24px; flex-direction: column; background: #0e130f; }
.extension-levels h3 { margin: 39px 0 11px; font-size: 20px; }
.extension-levels p { margin: 0 0 22px; color: var(--muted); font-size: 12px; line-height: 1.65; }
.extension-levels strong { margin-top: auto; color: #d8e4da; font-size: 11px; line-height: 1.45; }
.complex-conclusion { margin: 16px 0 0; padding: 25px 28px; border: 1px solid rgba(167,240,111,.3); border-radius: 12px; background: rgba(167,240,111,.06); color: #afbbb1; font-size: 15px; line-height: 1.7; }
.complex-conclusion strong { color: var(--accent); }

@media (max-width: 1000px) {
  .complex-goal-banner { grid-template-columns: 1fr; }
  .complex-pipeline { grid-template-columns: 1fr; }
  .complex-pipeline div { min-height: 100px; }
  .complex-pipeline i { transform: rotate(90deg); }
  .complex-demo-layout { display: block; }
  .extension-levels { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 700px) {
  .complex-goal-banner { padding: 25px 21px; }
  .complex-when-grid, .complex-film-grid, .complex-howto, .extension-levels { grid-template-columns: 1fr; }
  .spec-panel { grid-template-columns: minmax(0, 1fr); }
  .spec-panel > p { border-top: 1px solid var(--line); border-left: 0; }
  .variable-table { min-width: 650px; }
  .variable-proof { width: 100%; max-width: 100%; overflow-x: auto; }
  .panel-heading { align-items: flex-start; flex-direction: column; }
  .extension-levels article { min-height: 225px; }
}
`;
}

await writeFile(htmlPath, html, "utf8");
await writeFile(cssPath, css, "utf8");
console.log("Complex demo page synchronized.");
