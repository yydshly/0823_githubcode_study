# Three.js 3D 能力研究平台 v3

日期：2026-08-24

## 本轮结果

产品工作台已经从“Atlas 单一案例”升级为“可替换主体的复用基座”。

正式入口：<http://127.0.0.1:4176/workbench>

当前组合：

| 层 | 实现 | 当前证据 |
| --- | --- | --- |
| Render Core | 独立 Three.js WebGLRenderer、ACES、PBR 灯光、阴影、OrbitControls | 不启动游戏主入口 |
| Scene | neutral-inspection-world-none | 不请求沙漠、地形、植被或战斗模块 |
| Subject | SubjectAdapter v1 | Atlas 与 Nova 复用同一接入契约 |
| Presentation | Product Stage v2 | 两主体复用热点、镜头、材质、分解、转台和导演 |

这证明的不是“能自动生成任意好看的 3D”，而是：只要一个产品主体满足明确契约，就可以复用同一套网页 3D 展示、交互、质量分级和验证流程。

## 两个程序化主体

| 主体 | 类型 | 组成 | 特有能力 | 质量声明 |
| --- | --- | ---: | --- | --- |
| Atlas 巡检车 | 移动工业设备 | 59 个 Mesh、6 个部件组 | 桌面轮廓线、四轮结构、三类功能热点 | Prototype / L2 |
| Nova 能源节点 | 固定式工业设备 | 26 个渲染对象、12 个实例 | 三点支腿、旋转感知冠环、脉冲核心 | Prototype / L2 |

Nova 不是 Atlas 的换色版。它使用不同轮廓、不同零件数量、不同镜头、不同分解偏移和主体自身动画，因此能够验证 Product Stage 并未写死“载具”逻辑。

两个主体都没有加载外部 GLB、纹理或贴图，不能代表真实商业资产质量。

## SubjectAdapter v1

适配器在挂载时验证并统一处理：

1. root Object3D；
2. parts 可分解零件组；
3. sockets 热点世界坐标；
4. cameraPresets 主体镜头；
5. materialVariants 材质变体；
6. manifest 来源、质量与外部资源声明；
7. 比例归一、包围盒接地和初始朝向；
8. 桌面/移动质量档；
9. 主要轮廓阴影预算；
10. 主体更新和显式资源释放。

如果零件、插槽或镜头引用不存在，适配器会在初始化阶段失败，而不是等用户交互后出现空热点。

当前契约已经证明两个程序化 Object3D 可替换；尚未证明异步 GLB 加载、骨骼动画映射、外部纹理生命周期和许可元数据。

## Product Stage v2

同一个展示控制器现在支持：

- Atlas / Nova 手动切换；
- 键盘 S 循环主体；
- 每个主体独立的三个热点和三个镜头；
- 每个主体独立的三套材质；
- 通用分解/收拢；
- 自动转台；
- reduced-motion；
- 桌面高质量与移动轻质量；
- 22 秒双主体导演：Atlas 建立、功能特写、材质和分解，再切换到 Nova 的动画、核心和支腿；
- 动态 FPS、p95、draw calls、triangles 与 textures；
- 公开运行时快照和主体注册表审计。

沙漠综合场景仍是另一条 Scene 逻辑；它没有被混入这个工作台。

## 性能结果

环境：本机 Chromium/WebGL；桌面 1440×900，移动 390×844。

| 指标 | 当前值 | 预算 | 状态 |
| --- | ---: | ---: | --- |
| 工作台 ready（Vite 热缓存） | 138ms | ≤5s | 通过 |
| Atlas 动态帧 p95 | 12.4ms | ≤33.4ms | 通过 |
| Atlas 高质量 draw calls | 116 | ≤120 | 通过 |
| Atlas triangles | 7,380 | ≤150,000 | 通过 |
| Nova 高质量 draw calls | 51 | ≤60 | 通过 |
| Nova triangles | 12,904 | ≤150,000 | 通过 |
| Nova 移动轻质量 draw calls | 37 | ≤70 | 通过 |
| 运行时 textures（含阴影） | 3 | ≤4 | 通过 |

### 本轮优化

Atlas 原始高质量为 151 calls。适配器只让 59 个候选对象中的 24 个主要轮廓投射阴影，保留桌面端 20 组边线，最终为 116 calls，降低 23.2%。

Nova 首轮为 84 calls。原因不是几何过多，而是透明核心的 transmission 触发额外场景透射预通道。当前中性舞台没有环境贴图，收益不足，因此保留透明、发光和清漆，移除 transmission；结果降至 51 calls，运行时 textures 从 4 回到 3。

这说明性能风险不能只看 Mesh 数。材质通道、阴影重绘、轮廓线和后处理都可能增加真实渲染调用。

## 浏览器验收

双主体验收 30 项全部通过：

- true world:none；
- SubjectAdapter 注册表有效；
- Atlas 与 Nova 都有 3 热点、3 材质；
- 主体切换后 Scene 与 Presentation 保持不变；
- 22 秒导演确实从 Atlas 跨到 Nova；
- 0 游戏/world 模块请求；
- 0 外部模型请求；
- 0 控制台错误；
- 390px 无横向溢出；
- 所有可见移动控件至少 44px；
- reduced-motion 停止转台；
- 8 项工作台性能预算全部通过。

证据：

- evidence/product-workbench/browser-report.json
- evidence/product-workbench/01-desktop-atlas.png
- evidence/product-workbench/02-desktop-atlas-exploded.png
- evidence/product-workbench/03-desktop-nova.png
- evidence/product-workbench/04-mobile-nova.png

## 当前可以复用

- 独立 Three.js 产品舞台；
- world:none 中性场景；
- SubjectAdapter v1 的程序化 Object3D 接入；
- 主体切换、热点、镜头、材质、分解、转台和导演；
- 响应式相机、移动质量降级和动态性能证据；
- 程序化设备快速原型的方法：基础几何、共享几何/材质、实例化、层级命名和局部动画。

## 仍然不能声称

- Atlas 或 Nova 是生产级工业模型；
- 任意 GLB 放进去就会自动获得好构图；
- 已完成室内展厅或空间配置器；
- 主游戏 Studio 已经摆脱沙漠 world；
- 完整游戏的移动端性能已经达标；
- 研究 Vite 路由已经完成生产部署。

## 主要风险

1. 外部资产：真实 GLB 的单位、轴向、材质、动画、贴图、许可和释放仍未验证。
2. 视觉质量：程序化 L2 适合研究与概念演示，不足以替代 L3/L4 商业资产。
3. 性能扩张：每个新主体必须单独测 calls、triangles、textures 和动态帧，不允许沿用 Atlas 数值。
4. 主项目耦合：轻量工作台已独立，但上游 Studio 仍创建完整 world。
5. 部署：当前入口由研究 Vite 中间件提供，还没有独立生产 build/preview 门。

## 下一阶段目标

1. 把 SubjectAdapter 扩展为异步外部模型入口，但在没有真实资源前不伪造 GLB 结论。
2. 给主体注册表增加加载状态、失败回退和逐主体预算声明。
3. 把 Product Stage v2 拆成可导入控制器，减少入口脚本中的 DOM 组合逻辑。
4. 增加第三类主体时优先选择机械臂、仪器或建筑构件，继续避免只做载具换皮。
5. 建立生产 build/preview 与 bundle 预算。
6. 单独治理七层实验和完整移动战斗的冷启动，不混用轻量工作台数据。
