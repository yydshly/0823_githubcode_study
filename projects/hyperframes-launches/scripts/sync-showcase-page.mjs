import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const htmlPath = resolve(workspaceRoot, "docs/projects/hyperframes-launches.html");
const cssPath = resolve(workspaceRoot, "docs/hyperframes.css");

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  const last = text.lastIndexOf(before);
  if (first < 0 || first !== last) throw new Error(`${label} expected exactly once`);
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let html = readFileSync(htmlPath, "utf8").replaceAll("\r\n", "\n");
html = replaceOnce(
  html,
  '<a href="#direct-demos">直接看成片</a>',
  '<a href="#direct-demos">快速看能力</a>\n        <a href="#all-showcases">19 个完整样例</a>',
  "header navigation",
);
html = replaceOnce(
  html,
  '<a class="primary-action" href="#direct-demos">继续看 6 支直接演示</a>',
  '<a class="primary-action" href="#direct-demos">先看 6 支能力片段</a>\n              <a href="#all-showcases">直接看 19 个项目</a>',
  "hero actions",
);
html = replaceOnce(
  html,
  '<div><strong>7</strong><span>IN-PAGE VIDEO DEMOS</span></div>',
  '<div><strong>26</strong><span>IN-PAGE VIDEO DEMOS</span></div>',
  "demo metric",
);

const catalogPattern = /      <section class="research-section" aria-labelledby="cases-title">[\s\S]*?(?=      <section class="research-section" aria-labelledby="evidence-title">)/g;
const catalogMatches = html.match(catalogPattern) ?? [];
if (catalogMatches.length !== 1) throw new Error("case catalog section expected exactly once");
html = html.replace(catalogPattern, `      <section id="all-showcases" class="research-section showcase-section" aria-labelledby="cases-title">
        <div class="section-kicker">04 / 全量样例墙</div>
        <div class="section-content">
          <h2 id="cases-title">19 个项目，不点外链，滚到哪里直接播到哪里。</h2>
          <p class="section-intro">每张卡片都是对应项目在本机真正渲染出的中段预览，不是封面图。为避免 19 支视频同时下载，页面会在卡片接近视口时加载，进入视口后静音播放；你仍可使用原生控件暂停、拖动和全屏。</p>
          <div class="showcase-grid" data-showcase-grid aria-label="19 个 HyperFrames 项目视频预览"></div>
          <noscript><p class="gallery-note">请启用 JavaScript，以加载 19 个页面内视频样例。</p></noscript>
          <p class="gallery-note">“8 秒”是为网页加载优化的代表片段；完整渲染文件仍保留在各项目的 <code>renders/</code> 目录，每张卡片也保留源码入口。</p>
        </div>
      </section>

`);

html = replaceOnce(
  html,
  "    <script>\n      (() => {",
  '    <script src="../hyperframes-showcase.js"></script>\n    <script>\n      (() => {',
  "showcase script include",
);
html = replaceOnce(
  html,
  "        let observer;\n",
  `        let observer;

        const hydrateVideo = (video) => {
          const source = video.querySelector("source[data-src]");
          if (!source) return;
          source.src = source.dataset.src;
          source.removeAttribute("data-src");
          video.load();
        };
`,
  "video hydration helper",
);
html = replaceOnce(
  html,
  `              if (entry.isIntersecting) {
                entry.target.play().catch(() => {});`,
  `              if (entry.isIntersecting) {
                hydrateVideo(entry.target);
                entry.target.play().catch(() => {});`,
  "viewport hydration",
);
html = replaceOnce(
  html,
  `        videos.forEach((video) => {
          video.addEventListener("error", () => video.closest(".hero-film, .demo-card")?.classList.add("is-unavailable"));`,
  `        videos.forEach((video) => {
          video.addEventListener("pointerdown", () => hydrateVideo(video), { once: true });
          video.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              hydrateVideo(video);
              video.play().catch(() => {});
            }
          });
          const markUnavailable = (event) => {
            if (event.currentTarget instanceof HTMLSourceElement && event.currentTarget.hasAttribute("data-src")) return;
            video.closest(".hero-film, .demo-card, .showcase-card")?.classList.add("is-unavailable");
          };
          video.addEventListener("error", markUnavailable);
          video.querySelectorAll("source").forEach((source) => source.addEventListener("error", markUnavailable));`,
  "manual video hydration",
);
writeFileSync(htmlPath, html, "utf8");

let css = readFileSync(cssPath, "utf8").replaceAll("\r\n", "\n");
if (!css.includes(".showcase-grid {")) {
  css += `

.showcase-section .section-content { max-width: none; }
.showcase-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 38px; }
.showcase-card { overflow: hidden; border: 1px solid var(--line); border-radius: 13px; background: var(--panel); }
.showcase-media { position: relative; overflow: hidden; aspect-ratio: 16 / 9; background: #050605; }
.showcase-media video { display: block; width: 100%; height: 100%; background: #050605; object-fit: cover; }
.showcase-media.square video { object-fit: contain; }
.showcase-media > span { position: absolute; top: 10px; right: 10px; padding: 7px 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(4,6,4,.76); color: #e8eee7; font: 700 9px/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .07em; pointer-events: none; }
.showcase-copy { display: flex; min-height: 182px; padding: 20px 21px 22px; flex-direction: column; }
.showcase-copy small { color: var(--accent); font: 700 9px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .08em; }
.showcase-copy h3 { margin: 25px 0 8px; font-size: 20px; }
.showcase-copy p { margin: 0 0 20px; color: var(--muted); font-size: 13px; line-height: 1.55; }
.showcase-copy a { margin-top: auto; color: var(--accent); font-size: 12px; font-weight: 700; }

@media (max-width: 1000px) {
  .showcase-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 620px) {
  .showcase-grid { grid-template-columns: 1fr; }
}
`;
  writeFileSync(cssPath, css, "utf8");
}

console.log("Synced 19-case in-page showcase with UTF-8 preserved.");
