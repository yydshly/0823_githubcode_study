# V2 R115 — 薄膜干涉实验室旗舰验证

## 阶段结论

R114 的视觉野心协议完成了第一次旗舰级端到端验证。最终页面为 [AURORA FILM · 薄膜干涉实验室](../../pages/v2/deliveries/thin-film-lab/index.html)：它不是用一张背景图包装编辑页面，而是让 Three.js 金属环、薄膜 Shader、视角相关干涉色与焦散持续承担视觉主体。

该结果通过一般最终质量门和独立 WowGate 后进入 V2 精选。它证明产品清晰度与视觉吸引力不需要二选一：主题、行动、模拟边界、移动端和失败回退仍然完整，同时运行态明显强于静态截图。

## 有界执行

- 一个创意方向：明亮的电影化程序材质工具。
- 一个素材批次：程序化金属环、薄膜与同源焦散；未调用生图或伪造商品模型。
- 一次完整构建。
- 一次视觉精修：增强色带层次并修正回退提示。
- 两次确定性修复：消除 Shader 角向分支切线接缝；让 `motion=full` 显式覆盖测试机的系统低动态偏好。
- 未启动第二主题、第二素材批次或重复模型调用。

## 浏览器证据

`e2e/v2-thin-film-lab-delivery.spec.ts` 在真实 Chrome 中 4 / 4 通过，耗时约 19 秒：

- 5 秒内 Hero 从成膜进入稳定综合色谱；
- WebGL 持续运行，3 draw calls、约 6,274 triangles，处于有界预算；
- 指针、滚轮、膜厚、张力和键盘同步改变场景与语义状态；
- Canvas 操作前后像素差超过 1%，不是只更新隐藏状态或文案；
- 390 × 844、`prefers-reduced-motion` 与 `?fallback=1` 保持完整内容、参数和主要行动；
- 没有 `pageerror` 或错误级控制台日志。

自适应证据只有四张：Hero 完成态、直接交互态、移动低动态态和 WebGL 回退态。数量由体验形态决定，不使用固定“四屏验收”规则。

## 最终身份与门禁

- `runId`：`direct-thin-film-lab-r114`
- `bundleHash`：`b1de4965ebe0c20fdd2b28be2200821c285fa798a7de2b87080a3df3ae8dfd67`
- 一般视觉质量：91 / 100，`pass`
- WowGate：92 / 100，`pass`
- 持久化记录：[r115-thin-film-lab.direct-creative-run.json](./evidence/r115-thin-film-lab.direct-creative-run.json)

只要 delivery 的 HTML、CSS 或 TypeScript 发生修改，就必须生成新 hash 并重新绑定两类证据；本记录不能为后续修订兜底。

## 对整体目标的意义

R113 保留为“明亮编辑 + 因果交互”能力证明，不再承担整体旗舰效果证明。R115 新增的是另一条同等重要的能力线：当主题确实需要材质、空间和实时状态时，Codex 可以选择 Three.js / Shader，构建五秒记忆点，并用真实浏览器和 WowGate 阻止普通页面被误称为旗舰。

该能力不是新的全局模板。之后的 brief 仍应自主选择编辑排版、空间滚动、工具数据、真实素材、声音媒体、插画互动或 WebGL；只有 `immersive / flagship` 且运行时确有主题价值时才要求 WowGate。
