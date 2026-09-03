# R137 · 狐步三拍

## Design contract

- Entry mode: brief-led direct implementation.
- Request revision: R137 / 1.
- Target user and context: 在自然教育馆里观察动物动作、但不需要阅读专业参数表的青少年与普通访客。
- Desired first impression: 清晨雪地中的一只真实可动赤狐先建立生命感，界面像自然纪录片与野外观察手册，而不是暗色技术工作台。
- Visual ambition: Immersive / Exceptional.
- Experience architecture: Spatial Stage；宏结构为 `spatial-inspection`。
- Scene base: Three.js + 本地、可追溯 Fox GLB；DOM 只承担标题、三种动作选择、诚实边界、保存与回退。
- Scene persistence: 同一只狐在完整主旅程中持续可见；不得把模型缩成装饰图标或在切换动作时替换成图片。
- Foreground control model: `侦察 / 行走 / 奔跑` 三个语义动作、镜头复位、保存观察卡；鼠标/触摸拖拽用于环绕观察，滚轮用于克制缩放。
- State-to-scene mapping: 三种动作必须切换 GLB 内真实 `Survey / Walk / Run` 动画，并同步改变镜头距离、足迹节距、动作标题与观察提示。
- Mobile transformation: 390px 下保持狐为第一视觉，动作选择收为底部横排语义按钮；触摸拖动与保存继续可达。
- Fallback: WebGL 或 GLB 失败时显示带来源与许可的静态语义观察卡；三种动作说明和保存仍可用，但不得伪造 3D 或宣称动画已播放。
- Visual constraints: 冬日晨光、雾蓝雪面、狐橙与炭灰文字；不使用暗色玻璃面板、粒子科技场、参数仪表盘或三段式长滚动。
- Information constraints: 只描述模型中可验证的三套动画与可见动作差异；持续标明“模型动作演示，不是野外测量数据”。
- Operation constraints: 动作按钮、键盘 `1/2/3`、左右方向键共享一个动作状态；OrbitControls 只负责观察，不覆盖语义动作。
- State constraints: loading、Survey、Walk、Run、saved、reduced-motion、WebGL/GLB fallback。
- Environment constraints: 单一浅色主题；桌面与 390px；运行时无外部网络请求；模型、许可与来源均本地化。
- Primary journey: 看见同一只狐 → 选择三种真实模型动作 → 环绕观察动作与足迹节奏 → 保存“我的狐步观察卡”。
- User-defined phases: 模型质检与本地化；空间主舞台；动作与镜头联动；移动端、减少动态、失败回退；最终证据与归档。
- Required artifacts: `index.html`、`style.css`、`main.ts`、`assets/Fox.glb`、`asset-manifest.json`、本合同、浏览器证据和 DirectCreativeRun。
- Autonomy authorization: 用户已明确要求持续推进，可在当前项目与本阶段边界内直接完成、验证并归档唯一通过版本。
- User-decision boundary: 不接入后端、动物识别、实时野外数据、额外模型批次或商业化发布服务。
- Observable completion criteria: Fox.glb 字节、来源、许可、动画名和节点统计可验证；首屏模型自然落地；三种输入真实切换动画并产生可辨认状态；OrbitControls 可用；390px 无阻断溢出；reduced-motion 保留操作；强制模型失败后语义任务和保存仍可用；最终证据绑定唯一 runId + bundleHash。

## Design direction

| Decision | Chosen direction | Observable constraint | Acceptance criterion |
| --- | --- | --- | --- |
| Composition | 狐持续占据全屏雪地舞台，信息沿观察弧线出现 | 不是中央商品图 + 右侧控制台 | 第一眼先看到有尺度、有落地关系的狐 |
| Typography | 自然手册式衬线标题 + 清晰无衬线操作 | 信息不遮挡狐的头、腿和运动方向 | 桌面与 390px 均能先理解动作再操作 |
| Palette/material | 晨雪雾蓝、狐橙、炭灰、柔和日光 | 后处理只支持空间，不掩盖材质和轮廓 | 模型与雪面、阴影、雾层形成统一世界 |
| Motion | GLB 动画是主运动；镜头与足迹只解释动作状态 | 禁止无意义持续自转与炫技镜头 | Survey/Walk/Run 肉眼可分，切换有克制过渡 |
| Truth boundary | 模型动作演示与真实野外观察明确分开 | 不显示虚构速度、步频或生态结论 | 页面持续可见来源、许可和演示声明 |

## Coverage manifest

| Phase | Requirement / artifact | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 模型质检 | 唯一 Fox GLB、来源、许可、hash、bytes、动画/节点统计 | asset manifest | 文件与静态探针 | 0/1/9 | continue | 下载官方 GLB 后运行质量探针 |
| 空间舞台 | 模型为第一视觉且正确落地、比例可信 | desktop opening | 浏览器截图与场景观察 | 1/2 | continue | 实现 Three.js 主舞台 |
| 动作联动 | Survey/Walk/Run 切换真实 clip | buttons / keyboard | 动画状态与画布差异 | 4/5/6 | continue | 实现单一动作状态机 |
| 空间观察 | 拖拽环绕、滚轮缩放、复位 | pointer / touch / wheel | 真实输入前后状态 | 4/5/7 | continue | 接入受限 OrbitControls |
| 语义同步 | 镜头、足迹、标题、提示随动作同步 | three action states | DOM + scene observation | 5/6 | continue | 实现状态映射 |
| 保存行动 | 保存当前狐步观察卡 | selected / saved / reload | browser storage evidence | 5/6 | continue | 实现本地保存 |
| 移动端 | 390px 模型、按钮、保存无阻断 | mobile / touch | 浏览器截图与交互 | 7 | continue | 完成响应式检查 |
| 减少动态 | 禁用非必要镜头插值，保留动画选择与说明 | reduced motion | 媒体特性观察 | 7/8 | continue | 实现并验证 |
| 失败回退 | 模型或 WebGL 失败时语义观察与保存可用 | forced fallback | 浏览器状态与交互 | 6/8 | continue | 实现诚实 fallback |
| 性能 | 模型 A1/A2 预算、首屏 loading 可见、无阻断错误 | desktop/mobile | payload 与运行观察 | 8/9 | continue | 记录模型与 bundle 预算 |
| 工程闭环 | build、typecheck、V3 门、身份绑定 | final bundle | 命令与归档证据 | 9 | continue | 最终版本后执行 |

