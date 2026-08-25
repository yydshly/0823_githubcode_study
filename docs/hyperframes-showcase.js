(() => {
  const grid = document.querySelector("[data-showcase-grid]");
  if (!grid) return;

  const cases = [
    ["heygen-stripe", "BRAND × A-ROLL", "HeyGen × Stripe", "真人、字幕、联名品牌与 UI 合成。", "HF-heygen-stripe", ""],
    ["send-to-hyperframes", "DESIGN WORKFLOW", "Send to HyperFrames", "设计工具、纸张质感和光标动效。", "claude-design-send-hyperframes-launch", "square"],
    ["claude-paper", "RESEARCH STORY", "Claude Paper", "研究内容到叙事型产品发布片。", "claude-paper-launch", ""],
    ["cloud-render", "CLOUD", "Cloud Render", "云端渲染、界面素材与声音设计。", "cloud-render-launch", ""],
    ["figma", "SQUARE SOCIAL", "Figma Integration", "1:1 社交视频与多段产品素材。", "figma-launch", "square"],
    ["framemd", "STORYBOARD", "Frame.md", "从分镜文档到多场景成片。", "frame-md-launch-storyboard", ""],
    ["rebrand-templates", "RE-BRAND TEMPLATE", "Re-brand Templates", "同一运动语言替换品牌、颜色与文案。", "heygen-apple-motion", "square"],
    ["hyperframes-launch", "FULL STACK", "HyperFrames Launch", "GSAP、Shader、媒体、字幕与子合成。", "hyperframes-launch", ""],
    ["inspector", "INSPECTION", "Inspector", "单文件复杂场景、Lottie 与 Canvas。", "inspector-launch", ""],
    ["kimi-k3", "SHORT PROMO", "Kimi K3", "16 秒高密度模型产品宣传片。", "k3-promo", ""],
    ["liquid-refraction", "WEBGL", "Liquid Refraction", "液态折射、品牌卡片与 3D 视觉。", "liquid-brand-refraction", ""],
    ["pr-to-video", "CODE STORY", "PR to Video", "代码变更、Pull Request 与功能发布。", "pr-to-video-launch", ""],
    ["sfx-music", "AUDIO", "SFX & Music", "音乐、音效和视觉事件同步。", "sfx-music-launch", ""],
    ["spacex", "TECH LAUNCH", "SpaceX", "技术叙事、终端动画和完整音轨。", "spacex-launch", ""],
    ["texture", "MATERIAL", "Texture Launch", "纹理遮罩、材质与动态文字。", "texture-launch-video", ""],
    ["timeline", "EDITOR UI", "Timeline Editor", "时间轴、Lottie 与交互演示。", "timeline-launch", ""],
    ["variables", "DATA DRIVEN", "Variables", "变量驱动的多素材、多版本输出。", "variables-launch", ""],
    ["vfx-combined", "COMPOSITING", "VFX Combined", "人物、背景视频与 WebGL 叠加。", "vfx-heygen-combined", ""],
    ["website-to-video", "AGENT PIPELINE", "Website → Video", "从网站和产品素材构建发布片。", "website-to-hyperframes", ""]
  ];

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  grid.innerHTML = cases.map(([slug, label, title, description, source, shape], index) => {
    const duration = slug === "liquid-refraction" ? 6 : 8;
    const number = String(index + 1).padStart(2, "0");
    const base = `../assets/hyperframes/showcase/${slug}`;
    const sourceUrl = `https://github.com/heygen-com/hyperframes-launches/tree/main/${source}`;
    return `
      <article class="showcase-card">
        <div class="showcase-media ${shape}">
          <video data-autoplay-demo="viewport" muted loop playsinline controls preload="none" poster="${base}.jpg" aria-label="${escapeHtml(title)} 项目视频预览">
            <source data-src="${base}.mp4" type="video/mp4">
          </video>
          <span>${number} · ${duration} SEC</span>
        </div>
        <div class="showcase-copy">
          <small>${escapeHtml(label)}</small>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
          <a href="${sourceUrl}">查看源码 ↗</a>
        </div>
      </article>`;
  }).join("");
})();
