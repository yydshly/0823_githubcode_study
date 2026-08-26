# R43：案例库展示修复记录

## 修复契约

- Entry mode：repair-led
- Target：`/cases.html`
- Visual ambition：Editorial，用真实案例视觉帮助用户区分能力方向
- Preserved behavior：现有五个模型最终案例、两个能力基准、现有排序
- Primary journey：识别案例差异 -> 打开稳定归档 -> 必要时查看生成记录
- Acceptance：同一 brief 只出现一次；每张模型案例卡显示自己的真实素材；稳定归档是主入口；桌面与移动端可读
- Authorization：用户已指出缺陷并要求继续当前项目，可直接实施可逆修复

## 基线证据

- 真实浏览器检查显示五张 `.case-card--model-final` 的 `::before` 都指向 `/creative-assets/fashion-fluid-couture-cutout-v2.png`。
- 五张卡片主按钮都指向 `/generated-runs/<id>/`，稳定 `/cases/<id>/` 仅为次入口。
- `cases.html` 的静态主标题仍写“一个完整作品”，实际模型精修作品为五个。
- “夜生表皮”和“从一枚种子开始呼吸”属于同一 brief、同一案例；后者是页面首屏标题。
- 唯一未入库的独立生成目标是“海洋记忆数字展陈”；当前版本无模型素材、无视觉评审，浏览器首屏为孤立半透明方块，不满足备用案例门槛。

## 正确卡片素材映射

| 案例 | 卡片主视觉 |
| --- | --- |
| 智能声音产品 | `/creative-assets/acoustic-resonance-instrument-v1.png` |
| 夜生表皮温室 | `/creative-assets/biomaterial-mature-greenhouse-v1.png` |
| 先锋时装 | `/creative-assets/fashion-fluid-couture-cutout-v2.png` |
| 梦境记录 | `/creative-assets/dream-room-awakening-v1.png` |
| 云上观测站 | `/creative-assets/observatory-approach-v1.png` |

透明主体使用 `contain`，环境素材使用 `cover`；每张卡片使用与素材相符的底色与遮罩，文字侧保持足够对比。

## 实施项

1. `cases-main.ts` 按案例 ID 设置主视觉 CSS 变量，并展示各自真实精修步骤。
2. `styles-cases.css` 使用 CSS 变量，不再硬编码时装素材。
3. 主按钮改为稳定 `/cases/<id>/`，生成记录降为辅助入口。
4. `cases.html` 更新实际数量与说明。
5. 桌面、移动端分别检查所有卡片的素材 URL、标题可读性和入口。

## 当前环境阻塞

沙箱文件刷新器可以创建新文件，但读取并更新既有文件持续返回 `helper_unknown_error: setup refresh had errors`。已多次对 `cases-main.ts` 与 `styles-cases.css` 运行最小 `apply_patch`，均在读取阶段失败；因此本记录只把可复现证据和精确修复映射落盘，不将浏览器临时注入误报为永久修复。恢复写入通道后，从上述五项继续。
