# NPC Runtime Scenarios v0.6

这个页面证明 KinderGrimm Recipe 不只是编辑器数据或预览图片：同一组确定性 Recipe 可以由运行时直接重建为带姿态、呼吸、眨眼、凝视和 boil 帧的真实角色。

## 启动

从仓库根目录运行：

```powershell
.\projects\kindergrimm\scripts\npc-factory.ps1
```

打开：

```text
http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824
```

## 三种消费模式

- Waystation：服务型 NPC，验证身份区分和社交站位。
- Encounter：前后排战斗编队，验证轮廓、姿态和透明部件深度排序。
- Council：剧情议事构图，验证视觉身份与台词/关系状态解耦。

三种模式都使用相同八个 fingerprint。场景只改变位置、缩放、姿态、运行时 role 和用途说明，不会重新生成角色美术。

## 可携带资产消费

场景现在有两种明确来源：

- `Seed Recipe`：本地共享核心根据 Master Seed 与当前内容包构建；
- `Imported JSON`：选择 NPC 工厂导出的 Batch Manifest，先校验 schema、固定上游提交、内容包 fingerprint/约束、数量、唯一性和逐角色 fingerprint，再使用文件中的 Recipe 重建角色。

合法文件进入场景后显示 `IMPORTED`；篡改 fingerprint 或损坏 JSON 会显示 `REJECTED`，并保留当前场景。`恢复 Master Seed` 可以退出文件来源并重新验证确定性。

## 运行链路

```text
Master Seed + Content Pack / Imported Batch Manifest
→ resolve or validate pack
→ generate or validate
→ 8 Recipe + fingerprint
→ buildContentCharacter
→ upstream buildCharacter + optional authored Canvas parts
→ upstream createAnimator
→ setDepthRank
→ Three.js 运行场景
```

角色表示类型是 `procedural-2d-canvas-texture`：Canvas 2D 部件作为透明 CanvasTexture 平面组合到 WebGL 中。它不是带蒙皮网格的 3D 模型。

## 浏览器降级

使用 `?webgl=off` 可以验证降级路径。画布不可用时，八个 Recipe roster、用途切换、角色选择、Manifest 导入、来源信息和 Inspector 仍然可用。

## 当前性能证据

Chromium 1440×900、DPR 1 的短采样中：

- 8 个角色；
- Original 约 114 个部件平面 / 230 draw calls；
- Mosslight v0.6 为 8 个角色追加 96 个自有平面，总计 214 个平面 / 430 draw calls；
- 五次暖重建为 216 / 229 / 230 / 192 / 221ms，中位 221ms；
- 2 秒 rAF 短采样约 110 fps（仅代表当前无头浏览器环境，不是正式 benchmark）。

正式游戏应按目标设备建立纹理、draw call、构建时间和角色同屏数量预算。当前演示的重点是验证数据与运行时闭环，不代表已经完成移动游戏性能优化。

## v0.6 内容包与自有视觉证明

Original 路径保持既有角色 fingerprint。`苔光旅站` 可由场景直接选择，也可随 Manifest 从工厂跨页导入；场景显示 pack、renderer、Recipe、Visual Fingerprint、12 parts 和五组 coverage。篡改任一 Visual Fingerprint 会被拒绝，并保留当前场景。v0.5 Manifest 仍精确重建三个旧部件并保持旧指纹；更早、没有 `visual` 的 Manifest 继续使用基础 renderer。

当前自有层仍是 CanvasTexture 纸片，不是 3D：角色主体来自上游，Mosslight 在运行时追加 ambient / head / face / body / ground 十二个部件。它证明的是“特定视觉内容可以被确定性生产、携带和消费”，不是把 2D 伪装成 glTF/FBX。

## v0.6 边界

- 没有碰撞、寻路、战斗数值、任务状态或存档；
- 没有正式 npm/TypeScript SDK；
- 没有后台资产库或远程 Recipe 服务；
- 没有把 2D 纸片角色伪装成 glTF/FBX；
- 没有运行时大模型或云端生成调用。
