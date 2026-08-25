# Mosslight v0.6 扩展蓝图

## 结论

Mosslight v0.6 是一套可确定性生成、导出、迁移并在运行场景消费的 **2D Canvas 视觉部件套件**。Three.js 负责把透明 CanvasTexture 平面组合进纸片 rig、处理动画与场景；它不生成 GLB、FBX 或带体积的 3D 模型。

运行时没有大模型、提示词、模型权重或远程生成 API。实际驱动链是：

```text
Master Seed + Content Pack
→ 受约束的 Recipe
→ renderer descriptor + fingerprint
→ 每个 part id 的独立稳定随机流
→ Canvas 2D draw callback
→ CanvasTexture plane + rig anchor
→ PNG / Sprite Sheet / Manifest / ZIP / live scene
```

未来的大模型只能作为可选的“意图 → 合法 Recipe/Pack 参数”翻译层；输出必须经过 schema 和 fingerprint 校验，不能绕过确定性生成器。

## 当前十二部件

| 覆盖组 | 部件 | 作用 |
| --- | --- | --- |
| ambient | halo、fireflies、route-ribbons、paper-flecks | 建立轮廓外氛围、路径感和纸张颗粒 |
| head | leaf-crown | 提供头部身份锚点 |
| face | cheek-sprigs、eye-glints | 提供近景面部识别，但不替换上游眼睛/表情 |
| body | waymark、mantle、seed-charm | 提供职业、服装叠层和携带物语义 |
| ground | ground-bloom、moss-footing | 把角色与旅站地面语法连接起来 |

部件稳定 id、覆盖分组和 palette 在 `runtime/content-packs.js` 描述；具体确定性 variant 和 Canvas 绘制在 `runtime/mosslight-kit.js`；`runtime/visual-pipeline.js` 负责把 descriptor 解释为真实 rig entries。

## 如何生产下一套类似能力

1. **先定义视觉合同**：列出 5 个覆盖组、稳定 part id、palette、允许物种/媒介、来源与许可证；避免从页面配色开始。
2. **为每个部件定义参数**：参数只来自 Recipe、renderer fingerprint 和 part id 的稳定随机流；禁止使用时间、`Math.random()`、网络结果或页面状态。
3. **实现真实资产函数**：每个 part 提供 Canvas draw callback、锚点、尺寸、深度、`authoredBy` 和释放路径；不能用截图滤镜冒充部件。
4. **生成可携带记录**：每个资产保存 renderer version/fingerprint、`addedParts`、variant 和 Visual Fingerprint；Pack snapshot 进入 Manifest 与 ZIP。
5. **提供版本迁移**：旧 descriptor 只重建旧 `features`，不能自动获得新部件。v0.5 的三部件记录在 v0.6 消费端仍保持原指纹。
6. **在真实场景验收**：工厂 hero/cards/PNG/sheet 和运行场景必须调用同一 pipeline；统计 authored planes、draw calls、构建时间，并验证篡改拒绝和恢复。

## 三条技术扩展路线

### A. 扩充 decorator（低风险）

适合阵营徽记、章节服装叠层、节日粒子、地面标记和品牌纸张颗粒。继续增加具名 Canvas parts，但保持上游主体、骨骼与表情。每次升级必须递增 renderer version，并保留旧 `features` 的迁移测试。

### B. 建设完整 2D content pack（推荐下一步）

替换核心头型、眼睛、身体、服装、道具和媒介笔触，形成独立视觉语法。建议先做 1 种新 media + 12 个核心主体 parts + 50 个固定测试 Recipe，再接入现有 Pack/Manifest/场景合同。

### C. 新建 3D backend（独立项目）

如果目标是自由视角、实体光照、碰撞、骨骼蒙皮或 glTF 交付，应新建 Voxel/Gloss/glTF backend，而不是继续叠加 2D 平面。需要额外定义单位、坐标、材质、骨骼、动画、LOD、碰撞与目标引擎合同。

## 可演示的使用场景

| 场景 | 演示重点 | 当前入口 |
| --- | --- | --- |
| 城镇/营地 NPC | 同一套件下的身份区分、服务站位、角色复用 | Waystation |
| 战斗遭遇 | 轮廓可读性、前后排、透明部件深度排序 | Encounter |
| 剧情议事 | 视觉身份与台词/关系状态解耦 | Council |
| 资产审查 | 12/24 角色批量覆盖、单体 Inspector、透明 PNG | NPC Factory |
| 内容交付 | Recipe、Sprite Sheet、Pack snapshot、ZIP CRC | NPC Factory Bundle |
| 版本/安全 | v0.5 导入、Visual FP 篡改拒绝、恢复 Seed | Runtime Manifest import |

## 完成标准

- descriptor 的所有 `features` 在五组 coverage 中恰好出现一次；
- 同一输入重复生成的 Recipe 与 Visual Fingerprints 完全一致；
- 工厂、PNG、Sprite Sheet 与场景消费同一组真实部件；
- 8 个角色的 authored planes 等于 `8 × parts/actor`；
- ZIP 三条目可解压且 CRC 有效；
- 旧版本精确迁移，新版本篡改被拒绝且当前场景保持；
- 1440、900、390 视口无横向溢出，键盘、reduced-motion、WebGL-off 均可用；
- 每个项目按目标设备设定 draw-call、纹理与构建时间预算。
