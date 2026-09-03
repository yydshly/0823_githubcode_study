# V2 R155 · 海底光缆听诊台

## Design contract

- Entry mode: brief-led direct implementation
- Request revision: R155 / effect-first real closure
- Target user and context: 海洋通信维护团队在出航前快速理解一段光缆的异常位置与恢复状态
- Desired first impression: 一束正在呼吸的玻璃光缆横跨深海，光、形变和声音都属于同一条线路
- Visual ambition: Immersive
- Experience architecture: Spatial Stage
- Visual constraints: 主题专属三维主体持续可见；避免把关键状态退化为文案、图标或装饰粒子；技术选择服从最终效果
- Information constraints: 开场说明对象与行动；中段解释异常；完成态明确为演示性听诊而非真实测量
- Operation constraints: 滚轮/阶段按钮推进检测；指针改变观察角度；声音按钮播放真实响应的浏览器合成声；最终可保存本次听诊
- State constraints: dormant → tracing → fracture → restored；每个状态同步改变光缆形变、脉冲、读数和文案
- Environment constraints: 复用现有 Vite、Three.js 与 V4 有界原则；不接后台模型、不新增供应商、不调用第二素材批次
- Primary journey: 进入深海线路 → 沿缆追踪 → 看见并听见故障回波 → 完成恢复模拟 → 保存听诊
- User-defined phases: 一个新主题、一个方向、一次构建、最多一次明确视觉精修
- Required artifacts: 独立 delivery、桌面默认/故障/完成态、390px、reduced-motion、WebGL fallback 浏览器证据、最终结论
- Autonomy authorization: 用户已明确“继续”，并要求不频繁确认、以最终效果为准
- User-decision boundary: 不部署远端、不改 V1、不接后台 Codex、不宣称模拟数据为真实海缆检测结果
- Observable completion criteria: 关键主体首屏可辨；滚轮产生可见三维变化；声音阶段有明显差异；移动端可操作；失败回退可完成；无调试残留和阻断错误

## Direction decision

| 决策 | 选择 | 可观察结果 |
| --- | --- | --- |
| 标志性现象 | 故障回波沿玻璃纤芯传播并在裂隙处分叉 | 脉冲、纤芯位移、光色和频谱共同变化 |
| 主体 | 可旋转的透明光缆与六束发光纤芯 | 不是背景贴图，指针和滚轮真实驱动视角与状态 |
| 媒介 | Three.js 物理材质 + DOM 仪器层 + Web Audio | 3D、声音与信息来自同一状态模型 |
| 素材策略 | 程序化结构最能准确表达连续可检查对象 | 不生成无状态主图，不用 CSS 几何冒充产品 |
| 参考原则 | spatial-product-topology、sound-as-state、interaction-as-message | 借用机制，不复制案例构图 |

## Coverage record

| 阶段 | 要求 | 状态/表面 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| R155 | 可运行空间舞台 | desktop / opening | `01-desktop-opening.png` + snapshot | Stage 1–3 | pass | 无 |
| R155 | 滚轮产生真实故障因果 | desktop / fracture | `02-desktop-fracture.png` + progress/strain/pulse | Stage 5–6 | pass | 无 |
| R155 | 声音阶段差异 | desktop / audio | AudioContext active + 42/140+/82 Hz 阶段频率 | Stage 5–6 | pass | 无 |
| R155 | 完成与保存 | desktop / restored | `03-desktop-restored.png` + saved=true | Stage 5–6 | pass | 无 |
| R155 | 移动端可用 | 390px | `04-mobile-fracture.png` + overflow=0 | Stage 7 | pass | 无 |
| R155 | reduced motion | desktop | reducedMotion=true + 稳定阶段 | Stage 7 | pass | 无 |
| R155 | WebGL fallback | mobile | `05-mobile-fallback.png` + 可保存 | Stage 8 | pass | 无 |
| R155 | 工程闭合 | source | TypeScript + 3 项 Playwright | Stage 9 | pass | 无 |

## Final decision

R155 已在一个方向、零次素材生成、一次完整构建和一次视觉精修内关闭。独立视觉判断为 `pass`：关键主体首屏可辨，裂隙状态产生真实三维分叉，声音频率与阶段同步，完成态行动清楚。它替换较弱的 `modular-room-sound` 精选入口，但旧页面仍保留为历史研究结果。
