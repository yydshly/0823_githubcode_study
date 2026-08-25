# Mosslight v0.5：自有程序化视觉层交付合同

## Design contract

```text
Entry mode: Revision-led / direct continuation
Request revision: R6 — 从可携带 art-direction constraints 升级为可观察、可复验的自有程序化视觉内容层
Target user and context: 需要验证“我们能否继续生产类似能力”的技术美术、游戏原型和内容工具团队
Desired first impression: 选择苔光旅站后，不只字段被锁定，角色画面本身立即显现一致的新视觉语法
Visual ambition: Editorial + Immersive evidence
Experience architecture: Hybrid Workspace
Visual constraints: 保留现有工厂/场景暗色工作台；新增视觉层必须在角色画布上可见；不以页面换色冒充资产变化
Information constraints: 展示 renderer id、版本、来源、视觉部件、render fingerprint；区分上游 base renderer 与本地 decorator
Operation constraints: 纯浏览器、无后端、无 LLM、无远程素材或新增依赖；Original 路径完全不变
State constraints: original / mosslight decorated；build success / renderer fallback；Seed / imported / rejected / recovered
Environment constraints: canonical 8882 HTTP；1440、900、390；键盘；reduced-motion；WebGL off
Primary journey: 选择 Mosslight → 生成相同确定性 Recipe → 本地视觉层增加专属部件与纹理 → 导出 Manifest/ZIP → 场景导入并重建同一视觉层 → 验证 render fingerprint
User-defined phases:
  1. 展示已有能力
  2. 驱动继续生产类似能力做技术扩展
  3. 分析使用场景并构建场景演示
Required artifacts:
  - renderer descriptor、validator、deterministic visual seed 与 render fingerprint
  - 至少三类本地程序化视觉部件，真实进入工厂与场景 canvas/WebGL
  - Manifest/ZIP renderer provenance 与跨页重建
  - 作者指南、场景说明、浏览器证据与最终审计
Autonomy authorization: 用户明确“继续”；沿已交付 v0.4 的下一阶段直接实施
User-decision boundary: 当前仍是研究视觉方向，不代表最终品牌定稿；完整重画 20 个上游部件、训练模型、3D glTF、后台资产库不在 v0.5
Observable completion criteria:
  - Original 的 12 recipe fingerprints、首项预览像素摘要和双条目 ZIP 不变
  - Mosslight 的 12 recipe fingerprints 保持 v0.4，pack fingerprint 随新增 renderer descriptor 正确升级
  - Mosslight 每个角色获得可见且确定性的专属纹理/部件；同输入两次 visual fingerprint 相同
  - 工厂角色卡、Inspector、PNG/Sprite Sheet 和场景 actor 都应用同一 visual pipeline
  - Manifest 与三条目 ZIP 携带 renderer descriptor；导入后 8 actors 的 render fingerprints 与工厂一致
  - 篡改 renderer descriptor 或 fingerprint 被拒绝，当前场景保持
  - 1440/900/390、键盘、reduced-motion、WebGL off 和可接受的构建预算均有真实证据
Coverage record: 见下表
```

## Asset representation decision

| 资产需要 | 选择 | 原因 | 明确边界 |
| --- | --- | --- | --- |
| 角色基础解剖、姿势、表情 | 上游 procedural 2D rig | 保留成熟的 20 部件、锚点和动画 | 不复制上游 renderer |
| 苔光纹理与身份部件 | 本地 deterministic Canvas 2D decorator | 可编辑、透明、低依赖，并能进入 Sprite Sheet 与场景 | 不是滤镜截图；必须成为 rig 的真实纹理平面 |
| 内容包与渲染身份 | JSON descriptor + fingerprint | 可携带、可验证、可缓存 | 不依赖内存 registry 才能消费 |
| 3D 输出 | v0.5 不实现 | 需要独立坐标、材质、LOD 和引擎合同 | 不把纸片 WebGL 误称为 glTF |

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | v0.4 基线保持 | factory + scene / Original + Mosslight | Original 12 fingerprints + 430192-byte 2-entry ZIP；Mosslight 12 fingerprints + 375370-byte 3-entry ZIP；scene 8 actors / 118 planes / 238 calls | 1 | pass | — |
| 2 | renderer descriptor | runtime / schema | `mosslight-canvas-decorator` v0.1.0；3 features；renderer `f7d84f29`；pack `f78b264d`；snapshot 校验通过 | 1 | pass | — |
| 2 | deterministic visual layer | runtime / repeated build | halo / waymark / fireflies 三个真实 CanvasTexture 部件；12 个 visual fingerprints 两次一致；首项 `aef31a9b`；与 Original 相比 10.42% 像素可见变化 | 2 | pass | — |
| 2 | 工厂真实预览 | factory / Mosslight | 12/12 visual records；卡片与 Inspector 显示 V#；1024 PNG 透明角 alpha=0；Sprite Sheet 与 hero 均应用 decorator | 4/5 | pass | — |
| 2 | Manifest/ZIP provenance | factory / export | 411594-byte ZIP；manifest 86715 + sheet 322381 + pack 2158；3/3 CRC pass；携带 renderer 与 12 visual fingerprints | 5 | pass | — |
| 3 | 场景实时消费 | scene / Seed + imported | Seed 与真实 File import 均为 8 actors / 142 planes / 24 authored planes；前 8 visual fingerprints 与工厂逐项一致 | 5 | pass | — |
| 3 | 篡改拒绝与恢复 | scene / invalid + recovered | 篡改 `assets[0].visual.fingerprint` 被拒；8 actors、选角与视觉记录保持；Tab+Enter 恢复 Seed；旧 v0.4 Manifest 以 base renderer / 0 authored parts 导入 | 6 | pass | — |
| 全部 | 信息与键盘语义 | desktop + keyboard | pack/renderer/visual identity 在工厂与场景可读；select、File input label、restore 均为 3px solid `#efaa88` focus-visible；键盘主旅程通过 | 4/7 | pass | — |
| 全部 | 跨视口与降级 | 1440 / 900 / 390 / WebGL off / reduced motion | 三视口 0px 横向溢出；WebGL off 保留 12/8 Recipe、renderer 与 visual metadata；场景 roster 8；reduced motion 自动 paused=true | 7/8 | pass | — |
| 全部 | 性能预算 | factory + scene | v0.4 118 planes / 238 calls / 240ms；v0.5 142 / 286；三次热重建 203/209/208ms，中位数 208ms | 8 | pass | — |
| 全部 | 文档与工程 | docs / syntax / HTTP / upstream | README、作者指南、实验室和展示页已更新；Node syntax 6/6；HTTP 4/4；upstream clean；0 continuation marker | 9 | pass | — |

## Baseline record

```text
Timestamp: 2026-08-24 Asia/Shanghai
Command: .\projects\kindergrimm\scripts\npc-factory.ps1
Factory URL: http://127.0.0.1:8882/projects/kindergrimm/npc-factory/
Scene URL: http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824&pack=mosslight-waystation
Original: pack 7d63c5ae / first recipe 9b8ee20e / ZIP 430192 bytes / 2 entries / CRC pass
Mosslight: pack 27b6349f / first recipe e4bdc857 / ZIP 375370 bytes / 3 entries / CRC pass
Scene: 8 actors / 118 part planes / 238 draw calls / 240ms build / deterministic true
Evidence: transient same-session baseline captures; removed after pixel and runtime comparison
Decision: pass — preserve Original exactly; retain Mosslight recipe vectors while replacing only its visual layer
```

## Final verification record

```text
Timestamp: 2026-08-24 Asia/Shanghai
Original regression: pack 7d63c5ae / first 9b8ee20e / 12 historical fingerprints / visualCount 0
Original preview: 331×331 alpha identical; 63 of 438244 RGBA bytes differ by at most 1 raster level; bundle exactly 430192 bytes / 2 entries / CRC pass
Mosslight: pack f78b264d / renderer f7d84f29 / first recipe e4bdc857 / first visual aef31a9b / 12 unique Recipe + 12 deterministic Visual FP
Visible delta: 11415 / 109561 preview pixels changed (10.42%) against Original; halo, waymark and fireflies observed
Mosslight bundle: 411594 bytes / manifest.json + spritesheet.png + content-pack.json / 3 CRC pass
Scene: 8 actors / 142 planes / 24 authored planes / 286 calls / warm rebuild median 208ms
Compatibility: exact v0.4 pack 27b6349f imported with 118 planes / 0 authored planes / base renderer
Responsive: 1440×900, 900×900 and 390×844; no horizontal overflow
Accessibility: keyboard select → File input → restore flow; all focus rings 3px solid #efaa88
Fallback: WebGL off keeps 12 factory Recipes, 8 scene Recipes/roster and all renderer metadata; reduced motion auto-pauses
Engineering: node --check 6/6; HTTP 200 4/4; upstream submodule clean; no runtime LLM or cloud API
Evidence: npc-factory-v05-mosslight-desktop/mobile.png; npc-scenarios-v05-mosslight-desktop/mobile.png
Decision: pass — v0.5 authored visual-content production, transport and scenario consumption are complete
```
