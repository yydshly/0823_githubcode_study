# Three.js 3D 能力研究平台 v1

## 路线

- Selected pattern：研究 + 可复用演示模板。
- Evidence branch：原沙漠综合场景、七层视觉实验、Studio 普通 `Object3D` 扩展口、既有浏览器与性能证据。
- Required inputs：当前固定上游源码与研究证据；v1 不要求真实 GLB/glTF。
- Expected output：轻量能力控制面、显式组合注册表、性能预算、风险清单和可执行验收。
- Skill update：不更新；结论先保留在本项目文档与证据中。

## 项目目标

本项目不是把 Claude of Tanks 包装成通用 3D 引擎，而是提取、演示并验证其中可复用的浏览器 3D 能力：

1. 渲染内核：Renderer、相机、PBR 灯光、阴影、后期、截图与录制。
2. 场景逻辑：地形、天空、雾、植被、建筑与世界尺度。
3. 内容主体：程序化坦克、研究对象和未来的外部 GLB/glTF。
4. 展示逻辑：分层检查、导演时间线、热点、材质变体与镜头预设。

四层可以组合，但必须显式声明。展台属于展示逻辑；沙漠属于场景逻辑。局部对象成功挂载不等于场景替换成功。

## 正式入口

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-research-platform.ps1 -Port 4176
```

- 控制面：<http://127.0.0.1:4176/research>
- 沙漠综合能力场景：<http://127.0.0.1:4176/studio?map=desert&showcase=capabilities&nogate=1>
- 七层视觉实验：<http://127.0.0.1:4176/studio?map=desert&showcase=capabilities&lab=layers&nogate=1>

工业展厅实验不再由正式入口提供启动链接。它保留为失败证据：普通对象挂载、热点和材质状态契约成立，但独立展厅世界、主体构图和场景替换没有成立。

## 配置边界

注册表位于 `showcase/research-platform-registry.js`，分别声明：

- `sceneProfiles`：`desert-world`、`neutral-inspection`、尚缺失的 `showroom-world`；
- `subjectProfiles`：四车编队、T-90M 检查主体、Atlas L2 原型、尚缺失的外部 GLB；
- `presentationProfiles`：Studio 导演、视觉分层、产品展台与无展示层；
- `demos`：两个可启动证据入口和一个 blocked 失败实验。

`auditRegistry()` 强制检查组合引用、唯一 ID 和 blocked 路由隔离。当前静态审计通过。

## 复用结论

### 已有证据支持复用

- Renderer、相机、灯光、后期与截图/录制链；
- Studio 导演时间线、演员轨道和效果编排；
- 七层视觉检查器及同镜头 A/B；
- 普通 Three.js `Object3D` 的挂载、刷新、tick 和显式释放接口。

### 需要提取后才能复用

- 真正控制 world 创建/隐藏/销毁的 `SceneProfile` 运行时；
- 统一比例、坐标、材质、动画、热点和释放的 `SubjectAdapter`；
- 不依赖具体世界坐标的 `PresentationProfile`。

### 当前不能声称

- 通用产品展厅；
- 任意 GLB/glTF 自动接入；
- 生产级工业模型质量；
- 移动端性能已达标；
- 已经是可部署的通用 3D 平台。

## 性能预算

预算是研究目标，不是上游官方承诺。

| 指标 | 当前值 | 目标 | 状态 |
| --- | ---: | ---: | --- |
| 桌面综合场景 ready | 19.498s | ≤30s | 通过 |
| 七层视觉实验 ready | 42.607s | ≤30s | 超预算 |
| 研究控制面 ready | 119–207ms | ≤1s | 通过 |
| 移动端战斗加载 | 73.9s | ≤45s | 超预算 |
| 整页 Geometry | 331 | ≤300 | 超预算 |
| 整页 Texture | 109 | ≤96 | 超预算 |
| 静止页面 rAF p95 | 4.3ms | ≤16.7ms | 有条件通过 |
| 主入口 gzip | 638KB | ≤500KB | 超预算 |
| 车辆工厂 gzip | 683KB | ≤500KB | 超预算 |

静止 rAF 仅表示默认不重绘时主线程没有持续压力，不代表 GPU 动态渲染成本。`renderer.info` 在 `autoReset` 下的最后一次调用也不能替代完整 draw calls / triangles 基准。

## 高风险

1. 场景与 world 负载耦合：中性检查仍加载完整沙漠 world，既影响正确性，也影响冷启动和内存。
2. 移动端加载：真实移动 QA 约 73.9 秒，仍明显超预算。
3. GPU 可观测性不足：缺少确定性动态镜头的稳定区间 draw calls、triangles 和 GPU timer 证据。
4. 外部资产适配缺失：尚无 GLB/glTF 的比例、轴向、材质、动画、热点、许可和预算门。
5. 包体偏大：主入口和车辆工厂 gzip 均超过研究目标 500KB。

## 验收证据

### 研究控制面

- 静态注册表审计：通过；9 项合同全部成立。
- 浏览器控制面：17/17 通过。
- 桌面与 390px 手机使用同一文档。
- 手机无横向溢出，触控目标至少 44px，reduced-motion 生效。
- 控制面没有加载 Three.js、游戏主入口或 world。
- blocked 工业实验没有启动链接。
- 控制台和页面错误：0。

证据：

- `evidence/research-platform/audit.json`
- `evidence/research-platform/browser-report.json`
- `evidence/research-platform/01-desktop-hub.png`
- `evidence/research-platform/02-mobile-hub.png`

### 正式 3D 入口

- 沙漠综合场景：通过；4 辆载具、25 个效果实例、17 类效果、6 个镜头、3 条演员轨道、0 控制台错误。
- 七层视觉实验：20/20 通过；ready 42.607 秒；环境、镜头、特效等阶段切换 0.087–1.015 秒。

## 下一步

1. 实现 `world:none`，让中性检查场景不创建沙漠 world。
2. 把 `SceneProfile` 从注册表合同推进为真实 mount/suspend/dispose 生命周期。
3. 实现首个 GLB `SubjectAdapter` 与模型质量/预算门。
4. 建立确定性动态性能基准，分别记录 CPU frame、draw calls、triangles、纹理和内存稳定性。
5. 增加移动低档：更低 DPR、阴影尺寸、后期质量、粒子数量和按需加载。
6. 将轻量研究控制面纳入正式构建，而不是只由开发服务器中间件提供。

