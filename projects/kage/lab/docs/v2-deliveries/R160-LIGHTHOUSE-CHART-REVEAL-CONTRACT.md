# R160 · 失踪灯塔海图显影 · 直接创作契约

## 设计契约

- Entry mode: `brief-led`
- Request revision: `R160 / first build`
- Target user and context: 进入虚构海洋档案、希望通过观察而不是阅读说明完成发现的人
- Desired first impression: 一张被海水侵蚀的巨大海图漂浮在暗室中，手边的显影灯让隐藏墨迹从纸纤维里浮现
- Visual ambition: `Immersive`
- Experience architecture: `Spatial Stage`；海图始终是操作表面，说明、进度与保存行动是前景层，不转成参数工作台或长页面
- Scene base: `SVG + Canvas + DOM/CSS`
- Scene persistence: 从寻找、显影、连线到归档始终保持同一张海图
- Foreground control model: 指针/触摸移动显影灯；键盘方向键移动；点击或 Enter 固定印记；底部显示发现进度与波长切换
- State-to-scene mapping: `searching → traced-1 → traced-2 → traced-3 → route-complete → saved`
- Mobile transformation: 390px 保持整张海图，底部信息折叠为紧凑状态条，触摸拖动直接显影
- Fallback: Canvas 或 SVG 滤镜不可用时，仍显示语义海图、三个可聚焦印记和完整发现/保存流程
- Visual constraints: 本研究刻意不用生成图片或 3D，用于验证蒙版显影机制；该选择不等于正式产品素材策略
- Information constraints: 第一眼理解“用光找印记”；不冒充真实海图、坐标、灯塔或历史档案
- Operation constraints: 发现必须由真实输入触发，不自动替用户完成；点击空白不增加进度
- State constraints: 三个印记分别位于不同区域，只有显影灯覆盖时可被发现；完成后航线必须连接实际印记
- Environment constraints: 现有 Vite/TypeScript；不引入后端、外部服务、额外依赖或素材批次
- Primary journey: 移动显影灯 → 找到并固定三枚灯塔印记 → 看见返航航线 → 保存这次显影
- User-defined phases: 一个方向、零素材批次、一次完整构建、最多两次确定性修复、最多一次视觉精修、浏览器验收
- Required artifacts: 可运行页面、桌面开场/操作前后/完成态、390px、键盘、reduced-motion、Canvas 失败回退、最终记录
- Autonomy authorization: 用户明确要求“继续”，并持续授权按小目标直接推进，不频繁确认
- User-decision boundary: 改换主题、接入真实海图数据或外部档案服务才需要新决定；本轮均不触发
- Observable completion criteria: 海图是明确视觉主体；显影光与指针/触摸/键盘同步；三枚印记不可在未照亮时误触；完成航线清晰；移动端无阻断溢出；无 Canvas 时仍可完成

## 内部方向比较

1. `SVG 显影海图`：用遮罩和真实输入让信息从纸张中出现，视觉现象与产品动作一致。
2. `WebGL 雾港巡航`：空间感强，但会把目标重新拉回 3D 镜头旅行，且关键发现更难解释。
3. `生成旧地图拼贴`：素材质感容易成立，但运行时价值弱，容易再次变成静态背景。

选择方向 1。理由不是“避开 3D”，而是它以最少充分媒介完成本主题最重要的因果：光照到哪里，档案才出现在哪里。

## 正向参考证据

1. `雷雨余光档案馆`：借用“短暂程序化现象最终留下可回看的证据”，不复制闪电或暗色 WebGL。
2. `月光潮池夜巡图卷`：借用“连续地点承载寻找路径”，不复制海岸全景或横向滚动。
3. `棱镜种子剧场`：借用“光是状态变化的原因而不只是装饰”，不复制温室、种子或光谱。

## 设计方向

| 层 | 选择 | 可观察标准 |
| --- | --- | --- |
| 构图 | 巨幅倾斜海图占据 70% 画面，说明沿左上与右下边缘悬浮 | 第一眼先看海图与光，不是 UI 卡片 |
| 焦点 | 暖白显影灯为最近层；隐藏靛蓝印记只在光下显现 | 指针移动时焦点和信息一起移动 |
| 排版 | 细窄档案编号、克制衬线标题、短句说明 | 不遮住三个搜索区域，不出现巨型模板标题 |
| 色彩 | 骨白纸、深海蓝墨、氧化铜绿、低饱和琥珀光 | 色彩分别承担纸、隐藏信息和显影状态 |
| 材质 | SVG 纸纤维、盐蚀边缘、CSS 混合、Canvas 水光 | 不依赖下载图片也能看出潮湿档案材质 |
| 深度 | 纸张阴影、玻璃反光、水光与前景灯形成四层 | 不是平面信息板，也不伪装真实 3D 模型 |
| 动效 | 指针驱动光、点击固定印记、完成后航线逐段显现 | 每个动效都对应观察、确认或完成 |

## 覆盖清单

| 用户阶段 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 开场 | 1440×900 / searching | `desktop-opening.png` + DOM | 9 | pass | 海图、显影灯与任务第一眼可理解 |
| 显影 | pointer / keyboard | `desktop-revealing.png` + 数据状态 | 9 | pass | 真实命中固定印记，空白不增加进度 |
| 完成 | route-complete / saved | `desktop-complete.png` + 保存结果 | 9 | pass | 三点航线、完成卡与保存动作一致 |
| 移动端 | 390px / touch-equivalent | `mobile-opening.png`、`mobile-complete.png` | 9 | pass | 三枚印记均可达，无横向溢出 |
| 减弱动效 | reduced-motion | 无非必要连续动画 | 9 | pass | 保留显影、连线和保存路径 |
| 能力回退 | Canvas unavailable | 可操作 SVG/DOM 路径 | 9 | pass | `canvas=off` 仍可完成三次显影 |
| 工程闭环 | type / build / browser | 命令与最终身份 | 9 | pass | 已绑定最终 `runId + bundleHash` |

## 执行边界

- 一个方向：失踪灯塔海图显影。
- 零素材批次，不调用生图。
- 一次完整构建；最多两次确定性修复。
- 浏览器发现明确视觉缺陷时最多一次精修。
- 未通过最终质量门则停止为研究结果，不进入 12 项精选库。

## 最终结果

- Final run: `direct-r160-lighthouse-chart-reveal`
- Bundle hash: `fb8f5b37af3131edf0c88acbd20fda28c0b57e331115599501ec06e123787217`
- 最终记录：`docs/v2-research/evidence/r160-lighthouse-chart-reveal.final.json`
- 浏览器环境：Chromium，1440×900、390×844、键盘、reduced-motion 与 `canvas=off`。
- 研究结论：蒙版、真实命中、键盘、移动端与返航连线通过能力研究门，可保留在有限“研究参考”库。
- 产品结论：不通过正式产品交付门。页面没有正式素材，也没有证明程序化视觉本身是产品功能；“保存”只结束演示，没有持续结果或后续路径。因此不得标记为正式产品案例。
- 停止：不再以视觉修补把技术演示包装成产品；下一阶段由 V5 产品旅程门驱动一个完整产品网页。
