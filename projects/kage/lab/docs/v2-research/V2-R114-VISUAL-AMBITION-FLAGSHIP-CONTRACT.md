# V2 R114 — 视觉野心与 WebGL 旗舰验证契约

## 路由结论

- Selected pattern：电影化程序材质工具（Hybrid DOM + persistent WebGL）。
- Evidence branch：现有 Three.js 运行时、相机与滚动驱动、Shader 材质、质量分级和 DOM fallback。
- Required inputs：现有 `three@0.185.1`、`createGeneratedThreeRuntime` 与程序化几何；不需要外部 GLB、图片或模型生成。
- Expected output：`AURORA FILM / 薄膜干涉实验室`，前 5 秒完成环体入场、薄膜形成、干涉色展开与稳定停留；随后厚度、张力、滚轮和指针真实改变场景。
- Skill evidence update：只有真实运行、浏览器验收与 WowGate 通过后，才沉淀“程序材质旗舰”能力结论。

## 设计契约

- Entry mode：revision-led。此前 R112 的产品清晰度与有界质量门保持有效；本轮新增同等优先级的视觉吸引力目标。
- Request revision：R114。
- Target user and context：希望把一句创意直接变成具有品牌记忆、动态和空间质感网页的创作者与普通用户。
- Desired first impression：页面打开 5 秒内，用户看见金属环中的透明薄膜从近乎不可见到干涉色完整形成，并意识到这是可亲手调制的光学现象。
- Visual ambition：Immersive / Flagship。
- Experience architecture：Spatial Stage。WebGL 场景持续承担视觉主体，DOM 负责说明、参数、状态与行动。
- Scene base：Three.js WebGL；TorusGeometry 环体、薄膜 Shader、视角相关 Fresnel/干涉色与受控光斑。
- Scene persistence：开场、探索与完成态保持同一场景；不切换成互不相关的页面图片。
- Foreground control model：轻量标题、实验状态、厚度与张力控件、主要行动；移动端为底部紧凑控制面。
- State-to-scene mapping：初始薄膜接近透明；形成态从边缘铺展；探索态参数与滚轮改变厚度、色带、曲率和光斑；完成态稳定为可读的综合色谱。
- Mobile transformation：保留同一 WebGL 主体，降低网格与 DPR，控件进入底部面板；触控可达。
- Fallback：WebGL 失败时显示 CSS/SVG 光谱薄膜关键视觉，正文、参数说明和主要行动仍完整。
- Visual constraints：明亮实验室而非暗色科技；主题专属物理结构；无随机粒子；运行态必须明显强于静态截图。
- Information constraints：所有数值明确标为视觉模拟、非实验测量；不宣称科学精度或真实产品数据。
- Operation constraints：一个主题、一次程序材质素材决策、一次构建、最多两次确定性修复、一次视觉精修；不调用模型或生图。
- State constraints：指针改变观察/光照角，滚轮改变连续厚度时间线，控件改变厚度与张力；输入必须同时改变场景与可见状态。
- Environment constraints：沿用当前 Vite/Three.js；不增加后端、供应商、Figma、GLB 管线或发布视频。
- Primary journey：观看成膜 Hero → 滚轮或拖动观察色带 → 调整厚度/张力 → 保存一组模拟光谱。
- User-defined phases：视觉野心协议、可信 WebGL 路由、旗舰页面、WowGate 与归档。
- Required artifacts：`VisualAmbitionContract`、WowGate、可运行 delivery、真实浏览器证据、身份绑定记录、阶段结论。
- Autonomy authorization：用户已确认方向并要求继续，仓库内可逆实现不再重复确认。
- User-decision boundary：真实实验数据、商业产品模型、外部部署或新服务需要另行授权。
- Observable completion criteria：5 秒 Hero 可观察；WebGL 运行态优于静态图；主题、动态、空间和素材可信；桌面/390px/键盘/触控/reduced-motion/WebGL fallback 可用；无阻断错误；WowGate 通过才进入精选。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 视觉野心协议 | 旗舰与普通编辑页分开判断 | V2 类型与门禁 | Vitest、TypeScript | 0 | pass | `VisualAmbitionContract` 与身份绑定 WowGate 已通过定向测试 |
| 路由与可信度 | 不伪造真实产品 3D | 资产与渲染路线 | 仓库审计、页面声明 | 0–1 | pass | 使用程序薄膜现象，不调用 GLB 或生图 |
| 5 秒 Hero | 薄膜形成、干涉色与视角变化 | 桌面开场 | 真实 Chrome、Canvas 差异、运行 snapshot | 2 | pass | 5 秒内进入稳定综合色谱，运行变化可观察 |
| 空间与互动 | 指针、滚轮、参数改变 WebGL | 探索状态 | before/after 像素与状态 | 4–6 | pass | 全部输入同步改变场景、数值和保存结果 |
| 跨表面 | 390px、键盘、触控、reduced-motion | 移动与辅助状态 | Playwright、截图 | 7 | pass | 移动、键盘与静态完成态均完整 |
| 性能与回退 | 质量降级、WebGL failure DOM fallback | 高/低质量与失败态 | runtime snapshot、浏览器 | 8 | pass | 3 draw calls、约 6,274 triangles，回退可继续操作 |
| 最终归档 | WowGate + 一般质量门 + bundle 身份 | 精选或研究结果 | runId、hash、证据记录 | 9 | pass | 最终质量 91、WowGate 92，证据绑定同一 bundle |

## 能力基线

- Rendering stack：Vite、Three.js、WebGLRenderer、ShaderMaterial、ACES 色调映射；无需新增依赖。
- Scene assets：当前没有可信 GLB/GLTF/HDR 产品链；已有 PNG 深度案例与本主题不相关，因此不复用。
- Motion system：现有 requestAnimationFrame、滚动/指针状态、相机导演与质量分级可借鉴。
- Interaction：鼠标、触控、滚轮、键盘与语义 DOM 控件均已有案例证据。
- Visual quality：Shader、PBR 材质、Bloom 能力存在；本轮先不用 composer，以真实材质、构图和光照建立效果。
- Publishing path：仅完成浏览器页面与精选封面，不扩展录屏、MP4、配音或发布包。
- Risks：通用彩虹圆片、无意义镜头运动、移动端过载、运行时没有明显强于截图。上述风险均由 WowGate 阻断。
