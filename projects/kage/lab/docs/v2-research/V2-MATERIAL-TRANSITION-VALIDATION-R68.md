# V2 材质状态可见性验证 R68

## 设计契约

- Entry mode: Revision-led capability validation
- Request revision: R68
- Target user and context: 社区烘焙学习者需要通过同一只透明发酵罐理解温度、含水率和时间如何改变发酵状态。
- Desired first impression: 同一主体、同一机位、同一光线下，发酵状态变化清楚且可信；不是换图、数字跳动或装饰动画。
- Visual ambition: Immersive
- Experience architecture: Spatial Stage
- Scene base: 可读 DOM 控件与持续可见的状态主体；主体可由透明多状态素材、Canvas 或 Three.js 组合表达。
- Scene persistence: 参数调节、状态解释和保存动作中始终保留同一只发酵罐。
- Foreground control model: 温度、含水率、发酵时间；操作后同步更新主体和教学估算。
- State-to-scene mapping: 早期、活跃、成熟至少三个连续状态；体积、气泡密度、表面张力和颜色必须有足够明显且可归因的差异。
- Mobile transformation: 390px 仍保持主体与控制因果关系，不退化为长滚动宣传页。
- Fallback: reduced-motion 或无 WebGL 时仍能通过离散状态素材完成业务闭环。
- Visual constraints: 自然日光、浅木、麦粉白与发酵琥珀色；三态主体必须保持相同玻璃罐、轮廓、角度、尺度和光照；禁止文字、箭头、红框、分隔线、透明棋盘格和调试标注进入素材。
- Information constraints: 所有反馈明确标注为教学估算，不能伪装为食品安全结论。
- Operation constraints: 只验证现有 V2 `material-transition` 路由与素材门禁，不重写工作台、不引入新 API、不扩展业务。
- State constraints: 只生成一张三态透明状态表；只创建一个持久 Job；只进行一次 Codex authoring 和最多一次证据驱动修复。
- Environment constraints: `http://127.0.0.1:8144`；素材由当前 ChatGPT 图像生成能力完成；代码构建使用项目现有 Codex 5.6 流程。
- Primary journey: 看见同一发酵罐 → 调节参数 → 主体进入可辨认状态 → 读取教学估算 → 保存计划。
- User-defined phases: 素材证据接入；单次构建；浏览器验收；明确停止结论。
- Required artifacts: 三态透明素材、可追溯状态证据、持久 Job、可运行候选或明确阻断、桌面/390px/reduced-motion 验收记录。
- Autonomy authorization: 用户已明确“继续”，允许在现有 Kage V2 架构中完成本次有界验证。
- User-decision boundary: 不发布远端、不归档未通过页面、不为追求分数进行第二次素材生成或第二个 Job。

## 可观察完成标准

1. 上传素材的状态证据能从导入缓存完整传递到 `DedicatedCodeRequest`，并通过 `state-subject` 门禁。
2. 三个状态是同一发酵罐，不依赖主体尺度、位置或裁切跳变制造变化。
3. 参数操作使视觉锚点产生足够明显且可归因的画面差异，不能只改变 DOM 文案或数字。
4. 桌面、390px 和 reduced-motion 都能完成核心闭环。
5. 一次素材生成、一次 authoring、最多一次修复后必须停止，并给出 `complete`、`blocked` 或 `review-required`。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | R68 合同和停止边界 | 文档 | 本文件 | Stage 0 | pass | 检查状态证据传递链路 |
| 素材证据 | 三态透明素材及连续性声明 | asset intake / cache | `asset-e05c3711c59ee302`；`public/creative-assets/r68-fermentation-jar-three-state-v1.png` | Stage 1 | pass | 已验证 Alpha、状态数和证据恢复 |
| 单次构建 | `material-transition` 通过门禁 | persistent Job | `job-ce8eb705e95db0cb`；asset gate `ready` | Stage 4-6 | blocked | authoring 120 秒超时且无候选落盘，按合同停止 |
| 跨端验收 | 主体状态在 desktop / 390px / reduced-motion 可辨认 | browser | 无可运行候选 | Stage 7-8 | blocked | 未进入浏览器阶段，不能声称通过 |
| 收口 | 明确结果与耗时 | repository | Job `failed`；无归档案例 | Stage 9 | pass | 保留素材、证据链和性能修正，不重试 R68 |

## 素材生成记录

- Generation mode: built-in ChatGPT image generation, one generation call.
- Final asset: `public/creative-assets/r68-fermentation-jar-three-state-v1.png`.
- Dimensions / payload: 1536×1024 PNG, 2,568,638 bytes, `Format32bppArgb`；四角 alpha 为 0。
- Final prompt:

```text
Use case: scientific-educational
Asset type: transparent three-state product sprite sheet for an interactive fermentation learning workspace
Primary request: exactly three side-by-side views of the exact same clear cylindrical glass fermentation jar, showing three consecutive dough fermentation states for an interactive web product
Subject identity invariant: use one identical unbranded straight-sided glass jar with the same rim, base, proportions, front-facing three-quarter camera, scale, position, perspective, and natural daylight in all three views; the jar itself must not redesign or rotate between states
State 1, early: low dough volume around 30%, pale warm cream color, few tiny bubbles, slightly taut uneven surface
State 2, active: medium dough volume around 58%, warm wheat color, visibly increased small and medium bubbles, gently rising surface
State 3, mature: high dough volume around 82%, warm amber-beige color, dense but plausible bubble network, softly domed relaxed surface; no overflow
Style/medium: premium photorealistic product cutout with physically believable transparent glass, subtle condensation and realistic fermented dough texture; suitable as the principal visual subject in a high-quality interactive website
Composition/framing: one landscape sprite sheet divided only by empty transparent spacing into three equal visual columns; each complete jar fully visible from rim to base, vertically aligned on the same baseline, equal size, generous transparent margin, no overlap, no dividers
Lighting/mood: quiet natural side daylight, soft warm-neutral highlights, consistent contact-light cues but no rendered floor or background
Color palette: flour white, linen beige, pale wheat, restrained fermentation amber
Output intent: the web app will crop or translate between the three equal states while keeping the subject visually continuous
Constraints: genuinely transparent alpha background; exactly three jars; preserve identical jar identity and camera across all states; no text, labels, numbers, arrows, UI, boxes, red marks, separators, watermark, logos, checkerboard, props, hands, table, room, scenery, opaque backdrop, dramatic colored lighting, or decorative particles
```

## 最终有界结果

- `material-transition` 正确选择 `continuous-media-or-layered-subject`，合同明确要求至少三个连续状态。
- 上传 API 与缓存恢复现已保留 `experience.stateEvidence`；三态素材恢复后成功通过 `state-subject` 质量门禁。
- 旧资产路由曾把 `image-sequence` 映射成不可生成的 `environment` 并提前终止。Runner 现在把这类缺口交给 V2 质量门禁，形成可恢复的具体素材请求，而不是无检查点失败。
- 唯一一次 `gpt-5.6-sol` authoring 在 120 秒硬上限停止，且 `.artifacts/generation-candidates/run-18ulku7` 不存在，因此没有候选可做本地恢复或浏览器验收。
- 诊断时 authoring prompt 为 27,037 bytes，其中完整合同 JSON 为 19,167 bytes。新增专用 authoring brief 后，合同执行包从 11,899 bytes 减少到 7,777 bytes（35%），总 prompt 降至 22,915 bytes；完整研究合同仍保留给持久化与验收。
- R68 按停止条件结束为 `failed`，没有再次调用模型、没有创建第二个 Job、没有归档为案例。下一轮必须作为新的验证修订评估压缩后 authoring，而不能把本次失败改写为完成。
