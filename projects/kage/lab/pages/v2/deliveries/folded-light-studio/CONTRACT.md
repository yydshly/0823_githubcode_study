# R140 · 折光成形

## Design contract

- Entry mode: brief-led direct implementation.
- Request revision: R140 / 1.
- Final identity: `direct-r140-folded-light-studio`；最终候选以 `runId + bundleHash` 绑定。
- Target user and context: 想理解再生纸纤维灯具折叠结构、并预约查看实物样品的设计访客。
- Desired first impression: 一盏纸灯像工业设计杂志中的主角一样先以完全折叠形态出现；页面明亮、安静、有灯光舞台的尺度，不是参数工作台。
- Visual ambition: Expressive，最终视觉质量必须达到项目的 88 分优秀门才可判定 `pass`。
- Experience architecture: `spatial-journey`；一个 sticky 灯光舞台承载同一盏灯的连续展开，不拆成卡片墙或持久控制面板。
- Medium route: `generated-image`；primary rendering 为 `raster-image`，由同一生成批次的透明 PNG atlas 承担纸纤维、铰点、灯座、透光与四个连续形态。
- Asset boundary: 唯一生成源为 `assets/folded-paper-lamp-atlas-v1.png`；四个 `state-*.png` 只能是该 atlas 的机械像素裁剪 derivative，不得二次生成、重绘或替换主体。
- Asset evidence: atlas 与四个 derivative 均记录 width、height、bytes、SHA-256、alpha coverage、frame rect 和 source lineage；每个 derivative 必须与对应 atlas frame 像素完全一致。
- Scene persistence: 合拢、起势、展翼、成光始终是同一盏灯、同一铰点和同一灯座；状态变化通过四帧交叉淡化、暖光场与文案同步表达。
- Interaction model: `mixed`；滚轮、灯体指针拖拽和键盘共同写入一条 `targetProgress / displayProgress`，阶段按钮是同一进度的离散入口。
- State-to-scene mapping: shared progress 同时改变四帧权重、灯具状态、材料说明、光晕、桌面投影、阶段索引、ARIA slider 与预约解锁。
- Primary action: 只有进度达到完全展开后才解锁“预约看样”；点击后显示已预约状态。素材失败时可以预约实物，但不得伪装灯具已经展开。
- Mobile transformation: 390×844 与 reduced-motion 使用四个离散关键状态，保留主灯、阶段导航和预约行动，并禁止页面级横向溢出。
- Fallback: 任一运行时 state derivative 失败时隐藏所有生成状态图，显示线稿结构说明和“主视觉素材未载入 / 不伪装展开效果”，状态保持 folded，仍可预约实物看样；source atlas 只保留 lineage，不作为运行时成功的替身。
- Visual constraints: 再生纸白、纤维暖色、金属灰与克制棕色；主素材必须作为透明产品主体融入舞台，禁止全屏背景贴图、暗色玻璃面板、参数仪表盘和通用占位图。
- Truth boundary: 页面持续说明结构、透光与光影均为概念演示，不代表量产参数；生成图不冒充真实商品细节或工程测量。
- Environment constraints: 本地静态资产、单一浅色主题、无运行时外部网络依赖；桌面 1440×900 与移动端 390×844 均需保留主要行动。
- Bounded workflow: 一个方向、一次素材批次、一次构建、两次确定性修复（四态真实预载、显式输入来源保留）和一次视觉精修；证据固化不得重跑素材生成，浏览器只允许在这两项修复后更新同一既定四项矩阵。
- Required artifacts: `index.html`、`style.css`、`main.ts`、`CONTRACT.md`、`asset-manifest.json`、atlas、四个 derivative、既有 E2E report/screenshots 与最终 DirectCreativeRun。
- Bundle identity: 最终 `bundleHash` 按固定顺序覆盖 `index.html`、`style.css`、`main.ts`、`CONTRACT.md`、`asset-manifest.json`、atlas 和四个 derivative；既有浏览器报告的 runtime hash 单独保留并验证其运行时子集没有变化。
- User-decision boundary: 不新增第二素材批次、后端预约服务、真实量产参数、V3 registry 登记或 V2 首页入口。
- Observable completion criteria: 浏览器报告仍与当前 runtime 子集 hash 一致；atlas 与四个裁剪 lineage 可逐像素验证；滚轮、拖拽与键盘推进同一进度并解锁预约；移动端完成且无横向溢出；失败回退不伪装素材；最终视觉分达到优秀门并输出唯一 hash 与 verdict。

## Design direction

| Decision | Chosen direction | Observable constraint | Acceptance criterion |
| --- | --- | --- | --- |
| Composition | 左侧编辑标题与材料事实、右侧持续纸灯舞台 | 主素材不是卡片或全屏背景 | 首屏第一眼同时读到“折光”主题和完整折叠灯 |
| Typography | 大尺度宋体标题 + 克制等宽信息层 | 文字不承担伪造状态的职责 | 隐藏标题后仍可由纸灯四态辨认主题 |
| Palette/material | 纸白、纤维暖黄、金属灰、墨色 | 代码光效只增强生成素材 | 纤维、铰点和灯座在四态保持同一身份 |
| Motion | 四个真实 derivative 沿 shared progress 交叉淡化 | 禁止用 CSS 几何冒充纸灯展开 | 中段权重混合、最终 open 权重占主导 |
| Interaction | wheel / pointer drag / keyboard 共享进度 | 不形成参数工作台 | 三类真实输入都能推进同一状态并抵达预约 |
| Truth boundary | 概念演示与真实样品预约明确分开 | fallback 不显示任何伪展开 | 素材失败时 folded 状态和披露同时可见 |

## Final evidence ledger

| Evidence | Bound artifact / checkpoint | Acceptance |
| --- | --- | --- |
| Runtime identity | 既有 `report.json` + runtime bundle subset | report hash 与当前运行时文件重新计算一致 |
| Generated source | 1254×1254 transparent atlas | 单一生成源、bytes/hash/alpha 可复算 |
| Mechanical derivatives | 四张 627×627 PNG | frame rect 正确且原始 RGBA 与 atlas crop 完全一致 |
| Opening | `01-desktop-opening.png` | folded 主体加载、不是 body 背景、无横向溢出 |
| Shared progress | report + `02-desktop-mid-unfold.png` | wheel 后进度前进，drag 继续前进，keyboard 抵达 open |
| Completion | `03-desktop-open-booked.png` | open 权重占主导，预约确认可见 |
| Mobile | `04-mobile-reduced-open.png` | 390×844、四个离散状态、主要行动可达、无横向溢出 |
| Fallback | `05-asset-fallback.png` | state derivative 失败、线稿披露可见、状态不伪装展开 |
| Quality | final adaptive evidence | 综合分 ≥ 88、目标与独特性 ≥ 80、各适用维度 ≥ 75、无 major/blocking finding |
