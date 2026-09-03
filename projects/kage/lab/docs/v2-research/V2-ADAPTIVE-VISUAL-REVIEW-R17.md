# V2 R17 · 自适应视觉验收

## Why

原有 opening / middle / final / mobile 四屏是三段式页面的最低采样，不是创意网页的固定章节。把它写死会漏掉多次转折，也会迫使只有两个关键状态的体验制造无意义“中段”。

## Rule

- 直接读取 V2 creative contract 的 2–6 个 story beats。
- 第一个 beat 记为 opening，最后一个记为 final，中间每个 beat 保留自己的语义 ID 和 progress。
- 增加一个 390px、reduced-motion 的 mobile 基线。
- 因此一次验收为 3–7 个检查点，而不是固定 4 个。
- 没有 V2 合同的历史 bundle 才使用 opening / compatibility middle / final / mobile 回退。

## Boundary

检查点数量由叙事状态决定，但质量门保持不变：运行 ready、素材可见、无阻断错误、无横向溢出、文字可读、滚动从 opening 到 final 形成有效变化。视觉模型接收同一组自适应截图，不再假定附件永远是四张。
