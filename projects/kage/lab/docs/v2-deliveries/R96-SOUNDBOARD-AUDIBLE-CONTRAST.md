# R96 · 音板调校可辨识听感修复

## Repair contract

- Entry mode: repair-led；revision R96
- User goal: 基准音板与当前音板不能只是数值不同，普通浏览者必须能在连续试听中辨认变化
- Preserved invariants: R94 音板视觉、R95 浏览器手势解锁/静音/音量/能力回退、滚动不自动发声
- Observed evidence: 用户实听反馈 A/B 声音近似；代码中基频差通常小于一个半音，衰减与固定模态比例仅有轻微差异
- Root cause: 原始物理数值直接映射到合成器，在普通扬声器和非专业听音环境中缺少足够的感知距离
- Minimal intervention: 以同一力度为基准，对音高差作有界感知放大，同时联合映射衰减、亮度、模态比例和泛音能量；增加一次 A→B 连续试听
- Honesty boundary: 页面明确说明“感知差异放大”，只表达调校方向，不冒充实测声学结果
- Affected surfaces: desktop/mobile 声音控制区；playing/compare/muted/unsupported；键盘按钮路径
- Adjacent checks: 原有单次 A/B、滑杆释放、静音、音量、无 Web Audio 回退、移动端溢出
- Runtime: `npm run dev -- --host 127.0.0.1 --port 8143 --strictPort`
- Canonical URL: `http://127.0.0.1:8143/cases/dedicated-b4d381a24320/?quality=high&motion=full&revision=r96-contrast`
- Authorization: 用户指出缺陷并询问处理方案；结合此前“持续开发、不频繁询问”的授权直接修复

## Coverage

| Requirement | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- |
| 当前与基准具有可测的听感距离 | 参数测试确认 2.70 mm 状态比基准低约 2.1 半音、余振延长、亮度与模态能量增加 | 6 | pass | — |
| A→B 连续试听 | 浏览器确认先进入 `A · 基准音板`，1080 ms 后进入 `B · 当前音板` | 5 | pass | — |
| 不破坏 R95 边界 | A/B、滑杆、静音、音量、移动端、reduced motion、无 AudioContext 回退均通过 | 7 | pass | — |
| 归档闭环 | 5 个源码同步 bundle；案例编译 0 error；相关 Vitest 7/7；Playwright 2/2 | 9 | pass | — |

## Closure

- `mapSoundboardTone` 把真实方向映射为有界的感知差异；相同参数仍保持相同声音，不伪造变化。
- 页面新增“连续对比”与当前听感说明，普通用户无需记忆两次分散敲击。
- 支持边界保持不变：声音仍需手势启动，滚动不会自动播放，能力缺失时页面可继续操作。
- 本阶段无 `continue`、无 `defer`、无 `blocked`。
