# Kage V2 · 已验证示例接入 R09

状态：已完成  
日期：2026-08-27

## 设计契约

```text
Entry mode: revision-led
Request revision: R09
Target user and context: 从 V2 首页理解当前真实能力、直接打开已验证结果的项目访客
Desired first impression: 研究不是文档堆积，已经产生可运行成果
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 延续 V2 首页纸张、深绿和编辑式排版；示例必须有真实结果画面
Information constraints: 只展示通过浏览器验收的结果；区分成品交付与能力原型
Operation constraints: 每张卡片整体可点击，键盘可达，链接指向真实运行页面
State constraints: desktop / mobile / hover / focus / missing thumbnail
Environment constraints: 127.0.0.1:8143；深色增强页面由目标路由自行处理
Primary journey: 进入 V2 首页 → 看见已验证成果 → 理解每项证明什么 → 打开运行页面
User-defined phases: 接入已验证示例；验证页面与链接
Required artifacts: V2 首页示例区、三张正式缩略图、浏览器验收、交付记录
Autonomy authorization: 用户明确要求“把验证过的示例接入到我们的示例中，请继续”
User-decision boundary: 不接入未通过验收的临时 generated-runs，不增加新案例
Observable completion criteria: 梦境记录、连续媒体滚动、潮线证词三项可见；缩略图各自正确；桌面与 390px 无溢出；链接可打开；构建和定向浏览器测试通过
```

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 接入示例 | 三项已验证结果可见 | V2 首页 / desktop | final-desktop.jpg 与 DOM | 2-4 | pass | 三项结果已进入正式示例区 |
| 接入示例 | 各自缩略图和说明正确 | cards / default | 三张静态资产与文本 | 3 | pass | 成品和两项 E4 原型各自使用真实截图 |
| 验证链接 | 三个目标页面可打开 | links / keyboard | HTTP 200 与语义链接 | 5 | pass | 三条运行路径均可访问 |
| 跨端 | 390px 无裁切和横向溢出 | mobile | final-mobile.jpg 与自动化 | 7 | pass | 单列卡片，无横向溢出 |
| 工程收口 | 构建与测试通过 | build / e2e | Pages build、v2-composer.spec.ts | 9 | pass | 定向验收完成 |

## 边界

本轮只建立“少量、真实、已验证”的示例入口。研究候选、失败实验和重复版本继续留在研究记录，不进入正式示例展示。

## 验收结果

- 正式示例：梦境记录、连续媒体滚动、潮线证词。
- V2 Pages 独立构建通过，三张示例图片进入发布资产。
- V2 首页定向浏览器测试 1/1 通过，覆盖图片加载、三个目标页面、桌面和 390px。
- 连续媒体缩略图由 1.25 MB PNG 压缩为 38 KB JPEG；三张缩略图合计约 186 KB。
- 视觉证据：.artifacts/v2-verified-examples-r09/final-desktop.jpg 与 final-mobile.jpg。
