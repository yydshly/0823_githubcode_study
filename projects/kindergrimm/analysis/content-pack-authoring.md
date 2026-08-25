# Content Pack Authoring：如何继续生产“特定风格库”

## 先区分四个扩展层级

| 层级 | 改变什么 | 是否改 renderer | 当前状态 |
| --- | --- | --- | --- |
| Art-direction pack | 限定物种、媒介、色彩、命名、角色用途与来源 | 否 | v0.4 已实现 |
| Authored visual kit | 在既有角色上追加自有 palette 与真实 Canvas 部件 | 局部 | v0.6 已实现 12 个部件 / 5 个覆盖组 |
| Full content pack | 替换核心 media、parts、道具族与身份词汇 | 是 | 推荐下一阶段 |
| Rendering backend | 新笔触算法或 Voxel/Gloss 几何语言 | 是 | 需要独立开发与预算 |

`mosslight-waystation` 已从第一层推进到第二层。它既保留方向约束，又通过 `mosslight-canvas-decorator` 追加 ambient / head / face / body / ground 五组、十二个自有 CanvasTexture 部件。它产生真实、可复验、可迁移的视觉差异，但主体部件、骨骼和动画仍调用 KinderGrimm 上游 Canvas/Three.js，因此不能宣称是一套完全独立的画风引擎。

## v0.6 内容包合同

```text
kindergrimm-content-pack/0.1
├─ id / version / status
├─ provenance
│  ├─ kind / source / license
│  └─ upstreamCommit
├─ constraints
│  ├─ mode: input-driven | locked
│  ├─ species[]
│  ├─ media[]
│  └─ color | colors[]
├─ identity
│  ├─ names[]
│  └─ roles[]
├─ presentation
│  ├─ name / shortName / label / summary
│  ├─ accent
│  └─ tags[]
├─ visual?                         # 可选；旧包可省略
│  ├─ schema / id / version / kind
│  ├─ baseRenderer / runtimeModule
│  ├─ seedContract / features[]
│  ├─ coverage: ambient / head / face / body / ground
│  ├─ palette
│  └─ fingerprint
└─ fingerprint
```

Pack Fingerprint 覆盖完整 payload；Visual Fingerprint 则覆盖 Recipe、renderer identity 和确定性变体。修改 id、约束、身份词汇、来源、renderer 或展示信息都会使相应 fingerprint 失效；Manifest 消费者会在替换当前场景前拒绝这种不一致。省略 `visual` 的 v0.4 Manifest 仍按基础 renderer 解释。

## 自有视觉层如何被驱动

```text
pack.visual descriptor
→ visualRendererFingerprint(descriptor)
→ contentVisualRecord(recipe, pack)
→ base variant + crown / mantle / sprigs / glints / charm / ribbons / footing / flecks
→ buildContentCharacter(recipe, pack)
→ upstream buildCharacter(recipe)
→ makePart(Canvas draw callback) × descriptor.features.length
→ existing rig / animator / depth sorting / dispose
```

这里没有提示词、模型权重或远程推理。所有选择都由 Recipe、Pack descriptor、稳定哈希和种子伪随机数驱动；因此相同输入既能重建角色，也能重建自有视觉部件。v0.5 descriptor 只声明三个 features，v0.6 消费端据此仍只重建三个旧部件并保持原 Visual Fingerprint。

## 新建一个内容包

1. 在 `runtime/content-packs.js` 的 registry 中增加定义。
2. 使用新的 kebab-case id 和 semver；原型必须标记 `research-prototype`。
3. 固定允许的 species / media / color；不要在页面代码里重复这些规则。
4. 提供独立 names / roles，使场景身份与视觉方向一致，但不要把任务进度、生命值等运行状态写进 pack。
5. 在工厂与场景的 select 中暴露入口；生成核心、Manifest、ZIP 和 validator 会共享同一 snapshot。
6. 验证相同 Seed + pack 两次 fingerprints 一致；每个 Recipe 满足约束；篡改 pack 被拒绝且场景保持。

如果需要自有视觉，继续声明 `visual` descriptor，并在独立 kit 模块实现对应 renderer specs。新增部件必须具有稳定名称、确定性参数、明确 coverage、锚点、深度、释放路径和 Manifest 记录。可直接参考 [`mosslight-v06-extension-blueprint.md`](mosslight-v06-extension-blueprint.md)。

## 何时需要开发新 renderer

如果目标只是“这一章全部用水彩、排除 Nightmare、角色都是旅站职业”，内容包已经足够。

如果目标只要求在既有角色上增加阵营光环、徽记、粒子、服装叠层或章节配色，v0.6 的十二部件 kit 已经证明这条路线可用。

如果目标要求新的头身比例、新眼睛结构、新服装主体、新纸张纹理或完全不同的笔触算法，就必须继续扩展：

```text
用户视觉方向
→ reference / design tokens
→ 新 parts 与参数 Schema
→ 新 palette / media rules
→ Canvas 或 3D backend 实现
→ content pack 引用新能力
→ 批量覆盖测试与目标场景验证
```

## 大模型处于什么位置

当前运行时仍为 0 次 LLM / 0 次云 API。未来可选的 AI 层只负责把“苔光旅站的谨慎猫信使”转换为合法 pack id、Seed、角色槽位和 Recipe 约束；输出必须经过 Schema/validator，再交给确定性生成器。AI 不直接改写 fingerprint，也不绕过内容包合同。

## 适合的使用场景

- 游戏阵营、章节、城镇或活动限定 NPC 库；
- 绘本/品牌项目的角色批次与构图模板；
- 同一 renderer 下的多套美术方向 A/B 评审；
- 将 Manifest 交给关卡、剧情、商店或内容审核工具；
- 为未来 TypeScript SDK、后台资产库和自然语言适配层建立稳定输入边界。

