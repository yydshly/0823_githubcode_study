# 潮线证词 · 连续交互修复 R02

状态：已完成  
日期：2026-08-27

## 设计契约

```text
Entry mode: repair-led + revision-led
Request revision: R02
Target user and context: 希望通过拖动时间轴理解岸线变化的普通访客
Desired first impression: 刷新后立即看见完整海岸场；拖动时画面与证据像同一个系统
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 保留现有暗色档案视觉、全屏海岸场、证据读数和三段滚动叙事
Information constraints: 年份、消失面积、岸线后退、水位和局部透镜必须解释同一时刻
Operation constraints: 按下并拖动连续预览；释放吸附真实证据年；按钮、触摸和键盘仍可完成比较
State constraints: loading / WebGL / fallback / dragging / snapped / reduced-motion / context-lost
Environment constraints: 127.0.0.1:8143；1440×900、390×844；Chrome；单暗色主题
Primary journey: 刷新页面 → 滚动到比较 → 拖动年代 → 看见连续画面与数字 → 释放到证据年
User-defined phases: 修复背景；补全拖动联动；验证刷新、桌面、手机、键盘和回退
Required artifacts: 可运行页面、自动化验收、精简浏览器证据、交付记录
Autonomy authorization: 用户明确要求“优化这个示例”
User-decision boundary: 不引入新数据源、新素材、外部 API 或新的业务页面
Observable completion criteria: 刷新后始终存在 WebGL 或可读背景；拖动中间位置连续改变所有指标与海岸；释放吸附；局部透镜有读数；既有输入和回退不退化；构建和浏览器测试通过
```

## Spatial Stage

- Scene base：WebGL 海岸场，上层 SVG 证据线；CSS 海岸始终作为底层保险。
- Scene persistence：三个滚动阶段全程固定在视口。
- Foreground controls：年代轨道、连续拖动手柄、证据读数、局部透镜读数。
- State-to-scene mapping：同一连续时间参数驱动海岸形态、损失区、数字和手柄。
- Mobile transformation：保留底部时间轨道与读数，不改成长页面。
- Fallback：WebGL 初始化失败或上下文丢失时立即显示 CSS/SVG 海岸，继续完整比较。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 修复背景 | 刷新后背景可见 | desktop / reload / WebGL | 01-desktop-continuous-drag.jpg、canvas draw | 1/8 | pass | 已保留 CSS 海岸底层并等待首帧后启用 WebGL |
| 修复背景 | WebGL 失败仍可读 | desktop / fallback / context-lost | 04-fallback-evidence.jpg | 8 | pass | 已处理初始化失败与 webglcontextlost |
| 补全拖动 | 拖动连续变化 | desktop / pointer drag | 1994 中间态快照与 01-desktop-continuous-drag.jpg | 4-6 | pass | 已建立连续时间模型，释放后吸附 |
| 补全拖动 | 数值与场景同步 | compare / timeline | 年份 1994、1.6 km²、93 m、+4 cm | 6 | pass | 全部由同一 timelinePosition 驱动 |
| 补全拖动 | 透镜说明局部证据 | scene / pointer | 02-desktop-local-evidence.jpg | 5-6 | pass | 已增加局部退岸与局部损失读数 |
| 邻接检查 | 手机、键盘、reduced motion | 390px / keyboard / reduce | 03-mobile-evidence.jpg、浏览器路径 | 7-8 | pass | 既有输入与降级路径保持可用 |
| 工程收口 | 构建与自动化 | build / e2e | 7 个单元测试、3 个浏览器测试、生产构建 | 9 | pass | 本轮闭环完成 |

## 修复边界

本轮不增加第四个年代、不接入真实地理数据、不扩展新的案例页面。完成上述交互闭环后停止。

## 验收结果

- 单元测试：npx vitest run tests/v2-semantic-interaction.test.ts，7/7 通过。
- 浏览器验收：npx playwright test e2e/v2-semantic-interaction.spec.ts，3/3 通过。
- 生产构建：npm run build 通过。
- 视觉证据：.artifacts/v2-semantic-interaction-r02/，包含连续拖动、局部证据、移动端和强制回退四张截图。
- 结论：本示例已从“三个离散按钮控制场景”提升为“一个连续时间参数统一控制场景、指标、手柄与局部证据”的可复用能力样例。

## 用户反馈后的可发现性修复

- 观察：首屏虽然已经渲染，但停在 1984 时容易被理解为静态海报，底部操作说明不够显眼。
- 修复：增加“播放岸线变化 1984 → 2026”入口；支持 demo=1 打开后自动进入比较阶段并连续播放。
- 稳定性：提示只改变阴影，不再移动按钮位置，避免真实点击和自动化点击不稳定。
- 验收：桌面自动演示、连续拖动、移动端触摸、键盘、减少动态效果与 WebGL 回退共 3 条浏览器路径通过。
