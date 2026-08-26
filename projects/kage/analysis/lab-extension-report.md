# Signal Story Lab 扩展实验报告

## 扩展目标

验证 Kage 所展示的行为能否被重建为一个原创、配置驱动、可测试的叙事内核，而不是复刻其视觉或拆取其单文件代码。

```text
StoryConfig
  ├─→ 语义 DOM / 原生章节导航
  ├─→ ScrollDriver → 章节区间与进度
  ├─→ CameraDirector → Hermite 位置 + quaternion slerp
  └─→ SceneState mixer → 原创 Three.js 世界
                       ├─ quality profile / auto governor
                       ├─ reduced-motion 按需渲染
                       └─ WebGL context / semantic fallback
```

## 已实现

- 3 套原创配置，共用同一运行时：
  - `observatory`：品牌/产品叙事；
  - `archive`：数字展陈；
  - `explainer`：技术教育与复杂方案说明。
- 每章只声明文案、布局、scroll span、桌面/竖屏 shot 和 `sceneState`；新增章节无需修改导演器。
- 相机位置采用分段 cubic Hermite，方向采用相机语义的 quaternion slerp，FOV 用 smootherstep。
- 单一 Three.js canvas；三种 world preset 均由原创基础几何、实例信标、轨迹线和粒子构成。
- high/balanced/low 三档改变 DPR cap、实例数、粒子和阴影；auto governor 有坏窗口、好窗口与冷却条件。
- DOM 先构建、全文始终存在；`renderer=none`、WebGL 创建失败和 context loss 都保留正文/导航。
- reduced-motion 禁用 pointer parallax、CSS reveal/smooth scroll和连续 RAF，滚动/resize 时只渲染单帧。
- `debug=1` 才暴露只读 `window.__signalLab.snapshot()`；包含故事、章节、进度、质量、viewport 和 draw data。
- 生产 build 无运行时外部请求；Three.js 通过 npm 锁定为 `0.185.1`。

## 与上游的有意差异

| 维度 | 上游 Kage | Signal Story Lab |
| --- | --- | --- |
| 主题 | 寺院、月亮、黑红自然意象 | 信号场、档案网格、流程地图；深靛/薄荷/暖沙 |
| 内容模型 | DOM 与数组硬编码 | versioned `StoryConfig` + validation |
| 镜头 | Catmull–Rom position/target | 分段 Hermite position + quaternion orientation |
| 场景 | 大型定制程序世界 + 图像层 | 白名单原创抽象 preset，无图片资产 |
| WebGL 上下文 | 主场景 + 最多 3 个布料上下文 | 单一主上下文 |
| reduced motion | 主循环仍连续 | 空闲不跑 RAF，事件触发单帧 |
| fallback | 启动失败后解锁 DOM | fallback-first DOM + 明确 `renderer=none` 测试入口 |
| 运行探针 | 暴露大量内部对象 | 仅 debug 模式、只读结构化快照 |

这些差异是独立实现和产品化取舍，不代表对原作美术质量的替代。

## 浏览器证据

[`lab-runtime-report.json`](../evidence/lab-runtime-report.json) 记录了 6 个生产 build 场景：

| 场景 | 结果 |
| --- | --- |
| 1440×900 observatory / balanced / chapter 0 | WebGL running；4 章、4 导航；无 overflow/error/request failure |
| 1440×900 observatory / high / chapter 2 | high 档实例与粒子数量提升；镜头和章节同步 |
| 1365×768 archive / balanced | 换配置后标题、主题、world preset 与内容一起改变 |
| 390×844 explainer / low | portrait shot；low 档；无横向溢出 |
| 1280×800 reduced motion | `data-motion=reduce`；静态 shot；事件驱动单帧 |
| 1280×800 semantic fallback | canvas opacity 0；fallback 1；4 章/4 导航完整；runtime 为 null |

最终汇总：HTTP、正文、单 active chapter、横向溢出、console/page error、失败请求六项断言全部通过。视觉联系表见 [`lab-contact-sheet.webp`](../evidence/lab-contact-sheet.webp)。

自动测试结果：

- Vitest：2 个文件、3 个测试通过；覆盖全部 config validation 与 upstream 边界扫描。
- Playwright：5 个浏览器测试通过；覆盖 WebGL debug state、配置替换、fallback、reduced-motion 和移动端 overflow。
- TypeScript + Vite production build 通过；主 chunk 约 556 kB / gzip 144 kB，当前仅出现 `>500 kB` 的优化警告。

## 视觉验收发现

真实截图在开发过程中发现两项仅靠状态测试无法识别的问题：

1. 首个浏览器上下文在 WebGL 合成器稳定前截图会得到纯背景；证据脚本增加了明确稳定等待。
2. 初版相机方向用普通 `Object3D.lookAt` 计算并复制给 Camera，正/负 Z 前向语义相反，导致 draw calls 正常但世界不可见。改为相机对象计算四元数后，实例信标、轨迹环和粒子在所有 WebGL 截图中出现。

这说明“有 canvas、有 draw call、无 console error”仍不足以证明视觉结果正确。

## 当前没有实现

- 可拖拽的可视化镜头编辑器与 manifest 导入导出；
- glTF/图片/音频资产 registry、许可账本与流式加载；
- CTA、CMS、多语言、SEO、analytics 或业务后端；
- bloom 等后期、布料、多视口卡片或多上下文效果；
- 真机 GPU/显存/热功耗矩阵；
- WCAG 自动化与屏幕阅读器完整审计；
- AI 生成。AI 只应在 schema、lint、人工审批和来源治理稳定后生成草案。

## 下一轮优先级

1. **P0 导演台最小切片**：章节 rail、position/look/FOV inspector、safe-frame lint、JSON 导入导出与 screenshot diff。
2. **P0 品牌闭环**：给一套真实但权利清晰的品牌内容增加 CTA、SEO、性能预算和事件验证。
3. **P1 领域适配器**：游戏增加 3 个 lore hotspot；文旅增加 source/rights/locale/offline 字段。
4. **P1 生产硬化**：真机矩阵、context restore 失败注入、资源 dispose 审计、可访问全链路。
5. **P2 AI 副驾驶**：只生成受限 `StoryManifestDraft`，通过 schema/lint/人工门后才能预览，模型不拥有发布权限。
