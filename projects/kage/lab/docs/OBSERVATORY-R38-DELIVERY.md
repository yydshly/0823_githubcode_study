# R38 · 云上观测站效果优先交付记录

## 设计合同

- Entry mode：revision-led；把“MiniMax 必经”改为“最终效果优先，MiniMax 备用”。
- Target user and context：浏览创意技术作品的普通访客；无需理解 Three.js 或素材管线。
- Desired first impression：安静、真实、可进入的云上建筑，而不是紫色科技模板或图片海报。
- Visual ambition：Immersive。
- Experience architecture：Editorial Flow + persistent WebGL stage；滚动负责镜头叙事，DOM 负责可读文案和行动。
- Visual anchor：同一座白色圆形观测站、同一玻璃穹顶、同一台机械望远镜。
- State mapping：云海接近 → 穿过穹顶 → 星图由望远镜向空间展开。
- Fallback：low / reducedMotion 仍显示完整三段素材，只移除非必要漂移。
- Autonomy authorization：用户明确要求继续实现，并允许关键素材不足时直接使用 Codex / ChatGPT。
- Completion criteria：三张素材均真实使用；桌面首屏、中段、末段和 390px 移动端可见、无横向溢出和运行错误；只归档最终最佳版本。

## 素材策略

本轮使用内置 ChatGPT image generation，未调用项目 API：

1. 开场：蓝色黎明云海、白色圆形观测站、玻璃穹顶和引桥，左侧保留排版空间。
2. 中段：沿用同一建筑身份进入穹顶，机械望远镜、反射地面和云海形成前中后景。
3. 结尾：沿用同一穹顶与望远镜，星点、轨道和坐标场从仪器向整个空间展开。

稳定资产：

- `public/creative-assets/observatory-approach-v1.png`
- `public/creative-assets/observatory-dome-interior-v1.png`
- `public/creative-assets/observatory-star-atlas-v1.png`

三张素材都进入 `creative-asset-catalog.ts`，带 required、anchor、function、visualState、continuity 和 integration；匹配观测站 brief 时按 establish / transform / resolve 返回，不与时装等目标混选。

## 构建与修订

- Codex 首版：`dedicated-35f0e7233965`，四文件、三素材、第二次编译通过。
- 首版真实缺陷：Canvas 在普通文档流中占据首屏；滚动末段后 Canvas 离开视口；深色材质乘法压暗纹理；low 模式跳过全部图片。
- 自动视觉精修已采集四状态，但候选两次错误地在 TypeScript 中导入 `page.css`，均被编译门禁拒绝，首版保持不变。
- 根因增量版：`dedicated-0f538c770255`，只修改 scene.ts 和 page.css。
- 最终版：`dedicated-896cfb7e6657`，只继续修复移动端 14px 横向溢出和末段标题压住望远镜的焦点竞争。

最终网页：

- 运行：`/generated-runs/dedicated-896cfb7e6657/?quality=high&motion=full`
- 案例：`/cases/dedicated-896cfb7e6657/?quality=high&motion=full`
- 阶段：refined。没有伪装为自动 featured；原因是自动精修候选编译失败，最终结果由真实浏览器证据确认。

## 覆盖记录

| 用户阶段 | 状态 / 表面 | 证据 | 结果 |
| --- | --- | --- | --- |
| 描述目标 | 三个连续空间状态 | 三张项目资产及目录选择测试 | pass |
| Codex 构建 | 三个 required 素材 | build-report：assets=3，TypeScript 编译通过 | pass |
| 首屏 | 1440×900 / high / full motion | `evidence/r38-observatory-opening.png` | pass |
| 中段 | 960×600 / high / progress≈0.5 | `evidence/r38-observatory-middle.png` | pass |
| 结尾 | 1440×900 / high / progress=1 | `evidence/r38-observatory-ending.png` | pass |
| 移动端 | 390×844 / low / reduced motion | `evidence/r38-observatory-mobile.png` | pass；overflow=0 |
| 案例沉淀 | 同一目标只保留最终版本 | case catalog：dedicated-896cfb7e6657 | pass |

## 本轮结论

MiniMax 不是必须移除，而是不再成为主链路前提。效果优先的正确调度是：

```text
目标描述
  -> 判断是否缺关键视觉状态
  -> 最合适的模型生成连续素材（当前由 ChatGPT 完成）
  -> Codex 围绕素材生成专属代码
  -> 真实浏览器发现集成缺陷
  -> 小范围根因修订
  -> 只归档一个最终最佳结果
```

本次最重要的发现不是“多生成几张图”，而是素材与代码必须共享同一空间连续性合同。素材质量解决了画面上限；Canvas 定位、颜色空间、材质乘法、低画质策略和 DOM 层级决定这些素材是否能真正成为网页体验。

## 工程闭环

- 完整 Vitest：35 files / 107 tests 通过。
- TypeScript `--noEmit` 与 Vite 生产构建通过。
- 现有 Vite 无扩展名导入提示和 experience chunk 大于 500kB 提示仍存在；它们是此前已知的非阻断警告，本轮未借视觉交付扩大到打包重构。
