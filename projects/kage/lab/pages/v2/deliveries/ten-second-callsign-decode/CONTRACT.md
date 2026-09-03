# R139 · 十秒呼号解码

- Exact brief：为第一次参加业余无线电公开课的人设计一个「十秒呼号解码」网页。一条虚构演示电文以点划文字与合成音调同步出现，用户必须实际聆听并辨认点划节奏。点击试听按钮或按空格键播放每一段，点划在原位展开对应字母，之后提交解码；最终行动是保存这张呼号练习卡。页面像一张会发声的现代排版作品，使用明亮纸白、信号橙和墨黑。所有呼号与电文均为虚构演示。
- Architecture：`typographic-sonic-field / editorial-flow`。
- Primary medium：`code-native`；语义 DOM、SVG/CSS 点划与 Web Audio 共享同一 canonical sequence。
- State：`waiting → sounding → decoding → checked → saved`。
- Truth boundary：`KAGE` 仅为项目虚构练习代码；合成音不是录音、真实电台通信或认证训练。
- Bounded execution：一个方向、一次“无需外部主素材”的素材决策、一次构建、最多两次确定性修复与一次视觉精修。
- Adaptive evidence：opening、core、mobile、interaction、audio，另验证 reduced-motion 与 audio fallback。
- Archive boundary：只有最终 `runId + bundleHash`、浏览器证据与质量门同时通过时才进入 V3 精选。
