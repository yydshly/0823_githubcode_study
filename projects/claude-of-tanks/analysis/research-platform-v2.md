# Three.js 3D 能力研究平台 v2

日期：2026-08-24

## 本轮结论

在没有任何新增 GLB、纹理或外部 3D 资源的条件下，项目新增了一个可运行的程序化产品工作台：

- 正式入口：<http://127.0.0.1:4176/workbench>
- 场景：`neutral-inspection-world-none`
- 主体：`atlas-inspection-rover`
- 展示：`product-stage-v1`
- 外部模型请求：0
- 游戏/world 模块请求：0
- 程序化 Mesh：59
- 资产质量声明：Prototype / L2，可检查，不是商业级产品资产

这条证据链证明“沙漠不是基座本身”。Three.js 渲染、程序化主体和产品演出可以在不创建沙漠、植被、地图或战斗系统的条件下重新组合。

## 路线

- Selected pattern：可复用产品工作台模板 + 程序化原型。
- Evidence branch：独立 Renderer、world:none SceneProfile、Atlas Object3D、产品展示控制器。
- Required inputs：现有 Three.js 依赖；不要求外部模型。
- Expected output：独立场景、可检查主体、完整演出、性能预算和浏览器证据。
- Asset state：程序化占位资产。
- Quality level：L2 Inspectable。
- Main blocker：没有真实 GLB 资产，不能验证商业产品质量或任意模型适配。

## 架构边界

| 层 | 当前实现 | 证据 | 复用判断 |
| --- | --- | --- | --- |
| Render Core | 独立 WebGLRenderer、PBR、ACES、阴影、OrbitControls | `/workbench` 不启动游戏主图 | 可作为轻量模板复用 |
| Scene | 中性灯光、接地展台、网格、响应式质量档 | `world:none`，0 地形/植被请求 | 已证明独立场景 |
| Subject | Atlas 程序化巡检车，6 个部件组、59 Mesh | Mesh/材质指纹与显式 dispose | 普通 Object3D 可复用 |
| Presentation | 热点、镜头、三种材质、分解、转台、20 秒导演时间线 | 浏览器交互与截图证据 | 已证明产品演出组合 |

旧工业展厅实验仍保留为失败对照：它把对象挂进 Studio，但 Studio 先创建了沙漠 world，因此只能证明 Object3D 扩展口，不能证明场景替换。

## 当前工作台能力

1. 拖动旋转、滚轮缩放和响应式镜头。
2. 传感系统、能源模块、全地形驱动三个热点。
3. 石墨现场、救援橙、极地维护三种材质变体。
4. 六个部件组的程序化分解/收拢。
5. 自动转台与 reduced-motion 停止策略。
6. 20 秒全量导演演示：建立场景、部件特写、材质切换、结构分解、英雄镜头。
7. 桌面高质量与移动轻质量两档。
8. 动态 FPS、p95、draw calls、triangles、textures HUD。
9. 显式资源释放与公开运行时快照。

## 性能实测

环境：本机 Chromium/WebGL，桌面 1440×900，移动 390×844；稳定区间剔除首次着色器编译。

| 指标 | 当前值 | 预算 | 状态 |
| --- | ---: | ---: | --- |
| 工作台 ready（热缓存） | 133ms | ≤5s | 通过 |
| 首轮冷启动观察值 | 2.5s | ≤5s | 通过 |
| 桌面动态帧 p95 | 16.7ms | ≤33.4ms | 通过 |
| 桌面高质量 draw calls | 151 | ≤160 | 接近上限 |
| 桌面 triangles | 9,304 | ≤150,000 | 通过 |
| 运行时 textures（含阴影） | 3 | ≤4 | 通过 |
| 移动轻质量 draw calls | 90 | ≤90 | 达到上限 |
| 移动轻质量动态阴影 | 关闭 | 关闭 | 通过 |

质量降级不是只改标签：移动档关闭阴影和装饰粒子，draw calls 从 151 降到 90。当前主体可用，但如果直接叠加高复杂度模型，很容易突破 draw-call 预算。

主项目的性能风险仍然存在：

| 入口 | 最新 ready | 预算 | 状态 |
| --- | ---: | ---: | --- |
| 沙漠综合能力场景 | 22.861s | ≤30s | 通过但偏慢 |
| 七层视觉实验 | 55.038s | ≤30s | 超预算 |
| 移动端完整战斗 | 73.9s | ≤45s | 超预算 |

轻量工作台证明的是“其他产品展示不必加载完整游戏”，不能推导为“原游戏已经完成性能优化”。

## 复用结论

### 现在可以复用

- 独立 Three.js 产品舞台；
- world:none 中性 SceneProfile；
- 普通 Object3D 程序化主体；
- 热点、镜头、材质、分解、转台和导演演出模式；
- 桌面/移动质量档与动态性能 HUD。

### 仍需提取

- 把同一 SceneProfile 生命周期下沉到上游 Studio，使 Studio 也能选择 world:none；
- 实现外部 `SubjectAdapter`：比例、轴向、包围盒、接地、材质、动画、热点和释放；
- 共享产品展示控制器，减少工作台入口中的组合逻辑；
- 几何/材质复用和批处理，为更复杂主体保留 draw-call 余量；
- 正式构建与部署路由。目前 `/research` 和 `/workbench` 仍由研究 Vite 中间件提供。

### 不能声称

- 程序化 Atlas 是真实工业产品；
- 已经拥有完整室内展厅/空间配置器；
- 任意 GLB 可以自动得到好画面；
- 原游戏移动端性能已经达标；
- 当前开发服务等同于生产部署。

## 验收

### 产品工作台

浏览器验收全部通过：

- true world:none；
- 0 游戏/world 模块请求；
- 0 外部模型请求；
- 三热点、三材质、分解和导演时间线；
- 桌面与移动质量档；
- 390px 无横向溢出、触控目标 ≥44px；
- reduced-motion；
- 0 控制台错误；
- 六项性能预算显式输出。

证据：

- `evidence/product-workbench/browser-report.json`
- `evidence/product-workbench/01-desktop-overview.png`
- `evidence/product-workbench/02-desktop-exploded.png`
- `evidence/product-workbench/03-mobile.png`

### 整个平台

- 注册表静态审计：通过。
- 研究首页浏览器验收：通过。
- 沙漠综合场景：通过。
- 七层视觉实验：20/20 通过。
- blocked 历史实验仍无正式启动链接。

## 下一步

1. 在没有外部资源时，先提取通用 `SubjectAdapter` 接口，并用第二个不同轮廓的程序化设备做替换测试。
2. 合并重复边线/材质，给桌面工作台把 draw calls 从 151 压到 120 以下。
3. 为研究入口增加正式 build/preview 路由和产物预算。
4. 等真实 GLB 到位后，运行模型质量、许可和资源预算门，再判断能否达到 L3/L4。
5. 单独治理七层实验和移动战斗冷启动，不把工作台的轻量指标混用到完整游戏。
