# V2 R145 · 极光无线电明信片

## R145.1 动态体验修订

- Entry mode：repair-led / scope revision。
- 用户观察：页面主要被感知为一张静态背景图，虽然交互和状态存在，但动态变化不足以形成情绪与参与感。
- 保留：专属极夜主视觉、单场景空间架构、调频四状态、Web Audio、键盘与回退能力。
- 根因：原 WebGL 天空遮罩方向错误，主要形变落在雪地而非极光区域；调频步长偏小；接收器没有明显的空间反馈，导致视觉变化被高质量静态图吞没。
- 最小完整修订：增强极光帘幕的连续形变与色散；让接收器产生可见脉冲和扫描光束；提高滚轮响应；保持文字与控制结构不变。
- 验收标准：不开声音时也能看出场景持续呼吸；调频前后画面必须产生可测量像素差异；共振态具有清晰光场与接收器响应；桌面、390px、reduced-motion 和回退路径保持可用。

| 修订覆盖项 | 状态 | 下一动作 |
| --- | --- | --- |
| 天空极光持续运动 | pass | — |
| 调频前后视觉差异 | pass | — |
| 接收器空间反馈 | pass | — |
| 桌面与 390px 邻接回归 | pass | — |
| reduced-motion / fallback | pass | — |

### R145.1 修订结果

- 修正了 shader 天空遮罩方向，极光帘幕现在持续发生低速弯曲、呼吸亮度与色散，而不是把细微扰动错误施加在雪地。
- 调频提高帘幕形变、色彩分离、亮度和接收器脉冲强度；滚轮步长会根据真实输入幅度在有界范围内响应。
- 接收器新增同心信号脉冲与指向天空的扫描光束，共振态不再只依靠文案解释变化。
- 浏览器验收直接比较调频前后的 Canvas 像素，平均差异超过质量阈值；同时确认 `visualEnergy`、频率与声音滤波共同上升。
- 390px 状态仍保持单一紧凑前景层，WebGL/素材失败和 reduced-motion 路径仍可完成寄出行动。

## 设计契约

- Entry mode：brief-led，验证 R144 新多媒介协议。
- Request revision：R145。
- 目标用户：对声音、自然现象与夜间旅行有兴趣的访客。
- Desired first impression：像站在极夜冰原接收一束正在移动的极光，五秒内看见专属空间与可调频的光。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage；场景持续存在，前景只有调频、聆听状态和寄出行动，不使用工作台侧栏。
- Scene base：高质量生成宽幅主视觉 + WebGL 纹理形变与频谱光带。
- Lead medium：generated-image，负责冰原、接收装置和极光的主题身份。
- Supporting media：procedural-webgl 负责频率驱动的极光变化；sound 负责可听调频差异；typography 负责叙事和行动。
- Visual constraints：主视觉覆盖全屏并与 UI 融合；不使用通用网格、随机粒子、参数面板或三段模板。
- Information constraints：明确这是艺术化无线电体验，不冒充真实极光观测或科学频谱。
- Operation constraints：滚轮/拖动/方向键共享同一频率；声音需用户手势开启；提供静音。
- State constraints：搜寻、捕获、共振、可寄出四个状态必须同时改变画面、文字和声音。
- Environment constraints：桌面 1440×900、390×844、reduced-motion、WebGL/素材失败回退。
- Primary journey：调频寻找信号 → 捕获极光声纹 → 共振形成明信片 → 寄出。
- User-defined phases：一次素材批次、一次构建、最多一次视觉精修。
- Required artifacts：可运行 delivery、主视觉资产、自动测试、最终浏览器证据、阶段结论。
- Autonomy authorization：用户已要求持续按规划推进，不频繁确认。
- User-decision boundary：只有方向冲突、外部真实服务或不可逆操作需要用户决定；本阶段没有。
- Observable completion criteria：五秒记忆点成立；输入真正联动画面与声音；桌面和移动端可用；失败回退仍能完成旅程；通过质量门才进入研究档案。

## 覆盖清单

| 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 专属主视觉 | 桌面开场 | `01-desktop-opening.png` + `imageLoaded=true` | 2 | pass | — |
| 调频因果互动 | 搜寻/捕获/共振 | wheel + `tune/state` snapshot + `02-desktop-resonance-audio.png` | 5/6 | pass | — |
| 真实可听反馈 | 声音开启/静音 | `audioEnabled/audioFilterHz` + 浏览器点击 | 5/6 | pass | — |
| 空间舞台而非工作台 | 桌面完整旅程 | 开场、共振、寄出三态浏览器证据 | 2/3 | pass | — |
| 移动端与键盘 | 390px / keyboard | `04-mobile-resonance.png` + End 键路径 | 7 | pass | — |
| reduced-motion / fallback | 降级路径 | `fallback/assetFallback/reducedMotion=true` | 8 | pass | — |
| 工程闭环 | build/test | 类型、单元、浏览器与生产构建 | 9 | pass | — |

## 验收结论

- 素材边界：只生成一批主视觉，没有重采样或重复修图；最终资产为 `assets/aurora-radio-landscape-v1.png`。
- 媒介协作：生成图负责冰原、接收器和极光的主题身份；WebGL、文字、频率读数与 Web Audio 全部由同一个 `tune` 状态驱动。
- 视觉判断：桌面共振态形成明确记忆点；最终行动层级清晰；一次精修后 390px 手机态不再发生标题和状态文案叠加。
- 交互判断：真实滚轮、拖动、方向键、声音开启和寄出操作均有可观察结果；声音与光场的频率映射同步变化。
- 真实性：页面明确声明为艺术化映射，不冒充真实极光频率或科学观测。
- 归档判断：达到研究参考质量门，写入“意境研究档案”；不自动升级为稳定精选案例。
- 停止原因：一个方向、一个素材批次、一次构建与一次视觉精修均已完成，继续扩展不会提高本阶段结论可信度。
