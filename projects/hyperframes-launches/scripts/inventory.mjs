import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const upstreamRoot = path.join(projectRoot, "upstream");
const analysisRoot = path.join(projectRoot, "analysis");

const publicVideos = {
  "HF-heygen-stripe": "https://hyperframes.dev/viewer/d6f7d40f-1e32-4b73-a551-af47cc19e8a2",
  "claude-paper-launch": "https://hyperframes.dev/viewer/659498ab-d77e-48a8-a719-dd97adbbd3e5",
  "cloud-render-launch": "https://hyperframes.dev/viewer/4259dc01-157a-4966-9c58-4e97faa2548e",
  "figma-launch": "https://hyperframes.dev/viewer/58fdce81-6ef0-4860-899d-d6b3da692a54",
  "frame-md-launch-storyboard": "https://hyperframes.dev/viewer/c5198458-4eaa-4933-a4e8-029c8010a845",
  "hyperframes-launch": "https://hyperframes.dev/viewer/9ab8d480-7507-4905-9222-ae6ea4b2fb5a",
  "inspector-launch": "https://hyperframes.dev/viewer/87889a4c-cc67-4e4a-b576-b57dd892fee3",
  "pr-to-video-launch": "https://hyperframes.dev/viewer/72c9b502-0c96-4bde-9a78-9a178267c475",
  "sfx-music-launch": "https://hyperframes.dev/viewer/1adcf040-9df5-46b9-ab56-8e33795b5f84",
  "spacex-launch": "https://hyperframes.dev/viewer/58d80c88-37fe-4527-a803-1b29c35373b7",
  "texture-launch-video": "https://hyperframes.dev/viewer/b92c24b4-5143-4bce-85ce-408be4c3c4ec",
  "timeline-launch": "https://hyperframes.dev/viewer/105200be-ebda-4209-a225-a2edf01cf1b7",
  "variables-launch": "https://hyperframes.dev/viewer/6387d7c2-3819-4e60-916c-e346a3598b67",
  "vfx-heygen-combined": "https://hyperframes.dev/viewer/3c3669b8-65d0-4f1f-8cdb-e608c1a58ff9",
  "website-to-hyperframes": "https://hyperframes.dev/viewer/85d2d8d5-bf5b-4d04-901d-7c3ae157a30a",
};

const titles = {
  "HF-heygen-stripe": "HeyGen × Stripe",
  "claude-design-send-hyperframes-launch": "Send to HyperFrames",
  "claude-paper-launch": "Claude Paper Launch",
  "cloud-render-launch": "Cloud Render",
  "figma-launch": "Figma Integration",
  "frame-md-launch-storyboard": "Frame.md Storyboard",
  "hyperframes-launch": "HyperFrames Launch",
  "inspector-launch": "Inspector",
  "k3-promo": "Kimi K3 Promo",
  "liquid-brand-refraction": "Liquid Brand Refraction",
  "pr-to-video-launch": "PR to Video",
  "sfx-music-launch": "SFX & Music",
  "spacex-launch": "SpaceX Launch",
  "texture-launch-video": "Texture Launch",
  "timeline-launch": "Timeline Editor",
  "variables-launch": "Variables",
  "vfx-heygen-combined": "VFX Combined",
  "website-to-hyperframes": "Website to HyperFrames",
};

const descriptions = {
  "HF-heygen-stripe": "真人 A-roll、品牌联名、字幕、UI 与旁白合成。",
  "claude-design-send-hyperframes-launch": "设计工具到视频工作流，含纸张质感、光标与界面动效。",
  "claude-paper-launch": "长篇研究内容转成叙事型产品发布片。",
  "cloud-render-launch": "云渲染产品故事、界面录屏、音效与媒体合成。",
  "figma-launch": "方形社交视频，展示 Figma 集成与多段产品素材。",
  "frame-md-launch-storyboard": "从分镜文档到多场景发布视频的完整制作案例。",
  "hyperframes-launch": "HTML、GSAP、Shader、媒体、字幕和子合成的综合展示。",
  "inspector-launch": "单文件复杂动效，覆盖检查器、Lottie 与 Canvas/WebGL。",
  "k3-promo": "短时、高密度的模型产品宣传片。",
  "liquid-brand-refraction": "液态折射、品牌卡片、WebGL/Three.js 视觉实验。",
  "pr-to-video-launch": "将代码变更和 Pull Request 包装成发布视频。",
  "sfx-music-launch": "声音设计、音乐节拍与视觉事件同步。",
  "spacex-launch": "技术产品叙事、终端/UI 动画和完整音轨。",
  "texture-launch-video": "纹理遮罩、Shader、材质与动态文字。",
  "timeline-launch": "时间轴编辑器功能演示，含 Lottie、字幕和音效。",
  "variables-launch": "变量驱动的多版本视频与素材替换。",
  "vfx-heygen-combined": "视频背景、人物抠图、WebGL 与视觉特效叠加。",
  "website-to-hyperframes": "从网站与产品素材生成发布片的 Agent 工作流。",
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if ([".git", "renders", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function firstNumber(source, name) {
  const match = source.match(new RegExp(`${name}=["']([0-9.]+)["']`, "i"));
  return match ? Number(match[1]) : null;
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function classify(source, media) {
  const checks = [
    ["GSAP", /\bgsap\b/i],
    ["CSS 动画", /@keyframes|animation\s*:/i],
    ["WebGL / Shader", /\bwebgl2?\b|fragmentShader|vertexShader|gl_FragColor|shader/i],
    ["Three.js / 3D", /three(?:\.module)?\.js|\bTHREE\.|three-js|perspective\s*:/i],
    ["Lottie", /lottie/i],
    ["SVG", /<svg|\.svg/i],
    ["Canvas", /<canvas|getContext\(/i],
    ["变量化", /data-composition-variables|data-variable|--variables/i],
    ["字幕", /caption|subtitle|class=["'][^"']*\bcap\b/i],
    ["嵌套合成", /data-composition-src/i],
  ];
  const capabilities = checks.filter(([, regex]) => regex.test(source)).map(([label]) => label);
  if (media.video > 0) capabilities.push("视频合成");
  if (media.audio > 0) capabilities.push("音频 / SFX");
  if (media.image > 0) capabilities.push("图片 / 品牌素材");
  return [...new Set(capabilities)];
}

async function inspectEntry(relativePath, group = "launch") {
  const directory = path.join(upstreamRoot, relativePath);
  const files = await walk(directory);
  // Capability claims come from executable/rendered source only. README and
  // agent instructions often mention technologies that the composition does
  // not actually instantiate, so they are deliberately excluded here.
  const sourceFiles = files.filter((file) => /\.(?:html|css|js)$/i.test(file));
  const sources = await Promise.all(sourceFiles.map((file) => fs.readFile(file, "utf8")));
  const source = sources.join("\n");
  const indexSource = await fs.readFile(path.join(directory, "index.html"), "utf8");
  const media = {
    video: files.filter((file) => /\.(?:mp4|webm|mov|mkv)$/i.test(file)).length,
    audio: files.filter((file) => /\.(?:mp3|wav|m4a|aac|ogg|flac)$/i.test(file)).length,
    image: files.filter((file) => /\.(?:png|jpe?g|webp|gif|svg)$/i.test(file)).length,
    font: files.filter((file) => /\.(?:woff2?|ttf|otf)$/i.test(file)).length,
  };
  const slug = relativePath.replaceAll("\\", "/");
  const topSlug = slug.split("/")[0];
  const lfsPointers = [];
  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.size > 200) continue;
    const text = await fs.readFile(file, "utf8").catch(() => "");
    if (text.startsWith("version https://git-lfs.github.com/spec/v1")) {
      lfsPointers.push(path.relative(directory, file).replaceAll("\\", "/"));
    }
  }
  return {
    slug,
    topSlug,
    title: titles[topSlug] ?? slug.split("/").at(-1).replaceAll("-", " "),
    description: descriptions[topSlug] ?? "可换品牌的产品动效模板。",
    group,
    duration: firstNumber(indexSource, "data-duration"),
    width: firstNumber(indexSource, "data-width"),
    height: firstNumber(indexSource, "data-height"),
    compositions: countMatches(source, /data-composition-src=/gi),
    htmlFiles: files.filter((file) => /\.html$/i.test(file)).length,
    media,
    capabilities: classify(source, media),
    publicVideo: publicVideos[topSlug] ?? null,
    sourceUrl: `https://github.com/heygen-com/hyperframes-launches/tree/main/${slug}`,
    lfsReady: lfsPointers.length === 0,
    lfsPointers,
  };
}

const topLevel = (await fs.readdir(upstreamRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== "heygen-apple-motion")
  .map((entry) => entry.name)
  .filter(async (name) => exists(path.join(upstreamRoot, name, "index.html")));

const entries = [];
for (const slug of topLevel.sort()) {
  if (await exists(path.join(upstreamRoot, slug, "index.html"))) entries.push(await inspectEntry(slug));
}

const templateRoots = [
  "heygen-apple-motion/01-ui-sting",
  "heygen-apple-motion/02-bouncy-ui",
  "heygen-apple-motion/03-message-sting",
  "heygen-apple-motion/04-generate-reel",
  "heygen-apple-motion/examples/instagram",
  "heygen-apple-motion/examples/spotify",
  "heygen-apple-motion/hero",
];
for (const slug of templateRoots) entries.push(await inspectEntry(slug, "template"));

const summary = {
  generatedAt: new Date().toISOString(),
  upstreamCommit: "199f7dc34c8e3f1d798c55f2074fe1bcbd6fd5ba",
  topLevelProjects: new Set(entries.map((entry) => entry.topSlug)).size,
  runnableEntries: entries.length,
  htmlFiles: entries.reduce((sum, entry) => sum + entry.htmlFiles, 0),
  media: entries.reduce(
    (sum, entry) => {
      for (const type of Object.keys(sum)) sum[type] += entry.media[type];
      return sum;
    },
    { video: 0, audio: 0, image: 0, font: 0 },
  ),
  allLfsReady: entries.every((entry) => entry.lfsReady),
};

const report = { summary, entries };
await fs.mkdir(analysisRoot, { recursive: true });
await fs.writeFile(path.join(analysisRoot, "capability-matrix.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# HyperFrames Launches 能力矩阵",
  "",
  `- 上游提交：\`${summary.upstreamCommit}\``,
  `- 顶层项目：${summary.topLevelProjects}`,
  `- 可运行入口：${summary.runnableEntries}`,
  `- HTML 文件：${summary.htmlFiles}`,
  `- 素材：${summary.media.video} 视频 / ${summary.media.audio} 音频 / ${summary.media.image} 图片 / ${summary.media.font} 字体`,
  `- LFS：${summary.allLfsReady ? "全部就绪" : "仍有指针文件未下载"}`,
  "",
  "| 入口 | 时长 | 画布 | 子合成 | 能力 | LFS |",
  "| --- | ---: | --- | ---: | --- | --- |",
  ...entries.map((entry) =>
    `| \`${entry.slug}\` | ${entry.duration ?? "—"}s | ${entry.width && entry.height ? `${entry.width}×${entry.height}` : "—"} | ${entry.compositions} | ${entry.capabilities.join("、")} | ${entry.lfsReady ? "就绪" : "缺失"} |`,
  ),
  "",
  "> 能力标签来自源码与本地素材的静态扫描；运行是否通过以 verification.json 为准。",
  "",
].join("\n");
await fs.writeFile(path.join(analysisRoot, "capability-matrix.md"), markdown);

console.log(JSON.stringify(summary, null, 2));
