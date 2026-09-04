# V2 R171A · 案例缩略图可见性修复

## 修复契约

```text
Entry mode: repair-led
Request revision: R171A
Target user and context: 在 V2 首页浏览已验证能力案例的项目访客
Desired first impression: 每个案例直接显示对应的真实最终画面，而不是黑块或破图
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 保留现有纸张、深绿与卡片排版，不重做 V2 首页
Information constraints: 页面只显示 V2_EXPERIENCE_ARCHIVE 中的 12 项有限研究参考
Operation constraints: 卡片整体可点击；桌面和手机维持现有纵向浏览
State constraints: desktop / 390px / hidden legacy cards / decoded visible thumbnails
Environment constraints: canonical runtime http://127.0.0.1:8143
Primary journey: 进入能力案例区 → 看见对应缩略图 → 理解能力 → 打开研究样例
Required artifacts: CSS 修复、Chrome 桌面与手机证据、运行报告
Autonomy authorization: 用户明确要求继续修复当前显示问题
User-decision boundary: 不新增案例、不替换案例内容、不修改 V1 或正式产品
Observable completion criteria: 旧卡片不可见；12 项有限参考可见；所有可见图片完成解码；无横向溢出或运行错误
```

## 根因与最小修复

`renderBoundedExperienceArchive()` 会给历史卡片添加 `hidden` 并移除图片 `src`，避免重复加载。历史交付卡片同时具有 `.verified-example-card--delivery { display: grid; }`，该作者样式覆盖了浏览器对 `[hidden]` 的默认隐藏样式，导致没有 `src` 的历史卡片重新出现为黑块和破图。

最小修复是在卡片样式中显式声明 `.verified-example-card[hidden] { display: none; }`。不改变网格、卡片尺寸、素材和案例数据。

## 精修记录

| 阶段 | 覆盖项 | 原始证据 | 最小干预 | 相邻检查 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 3 | 隐藏卡片错误显示 | 用户截图中梦境记录、纸张修复工坊等出现黑块与破图 | 恢复 `[hidden]` 显示优先级 | 12 项可见卡片及图片解码 | pass |
| 7 | 响应式案例列表 | 同一规则可能在 390px 被 `display: block` 再次覆盖 | 使用更高特异性的统一隐藏规则 | 桌面、390px、横向溢出 | pass |
| 9 | 工程与交付 | 需要绑定最终代码的真实浏览器证据 | Chrome 自动化与 Pages 构建 | 页面错误、请求失败、控制台错误 | pass |

## 证据

- `evidence/r171a-thumbnail-visibility/01-desktop-archive.png`
- `evidence/r171a-thumbnail-visibility/02-mobile-archive.png`
- `evidence/r171a-thumbnail-visibility/report.json`

本修复不改变 R171 指导基线，也不占用 R172 的正式产品验证名额。
