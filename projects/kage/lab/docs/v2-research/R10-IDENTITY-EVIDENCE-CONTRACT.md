# R10 · 身份与证据能力契约

状态：完成 · E4  
日期：2026-08-27  
时间盒：一个原型、一次定向验收；不生成新素材

## 目标

验证模型如何把品牌身份、主体素材和证明内容组织成同一个视觉系统，避免把“高端、未来、创新”默认翻译成紫色科技风、粒子背景或无意义 Three.js 几何体。

## 设计契约

```text
Entry mode: brief-led + research-led
Request revision: R10
Target user and context: 需要理解虚构生物材料品牌来源、过程和表现的设计师与合作方
Desired first impression: 这是有材料来源和研究方法的品牌，不是一张装饰性海报
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 深色编辑感、温暖透光材料、持续字标；不使用常见科技蓝紫和程序化几何占位
Information constraints: SOURCE / PROCESS / PERFORMANCE 三类证据必须各自改变图像焦点、标题、说明和证据字段
Operation constraints: 滚动为主；按钮和键盘可直接选择证据；移动端保留同一阅读顺序
State constraints: loading / source / process / performance / asset-fallback / reduced-motion
Environment constraints: 127.0.0.1:8143；桌面 1440×900；移动端 390×844
Primary journey: 看见品牌身份 → 理解材料来源 → 观察形成过程 → 看到可验证表现 → 进入材料档案
User-defined phases: 完成第三项 E4；接入生成器与正式示例
Required artifacts: 能力数据模型、独立原型、定向测试、浏览器证据、选择/拒绝条件、阶段总结
Autonomy authorization: 用户要求继续既定 V2 推进
User-decision boundary: 不接入外部 API、不生成新素材、不声明真实商业材料数据
Observable completion criteria: 三种证据状态有不同图像与内容；身份始终可识别；桌面、390px、滚动、按钮、键盘、reduced-motion 和图片失败均可完成阅读；定向测试与 Pages 构建通过
```

## 能力边界

- 选择：brief 明确要求品牌身份、材料来源、研究过程、证明、指标、成果或可信行动。
- 拒绝：纯氛围落地页、真实 GLB 结构拆解、数据仪表盘、没有任何证据内容的抽象品牌。
- 输入：scroll / button / keyboard。
- 输出：视觉身份、主体焦点、证据类型、证明字段、行动语义。
- 素材要求：至少一个可识别主体或环境；图片必须有安全区和可读回退。
- 最小技术：DOM + responsive images；不要求 Three.js。
- 回退：图片失败后保留品牌、证据文本、顺序和操作。

## 覆盖记录

| 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 品牌与证据属于同一系统 | desktop / 3 states | 浏览器截图与状态快照 | 2-6 | pass | 三态素材、标题、证据字段同步 |
| 三种输入可切换同一证据状态 | scroll / button / keyboard | 浏览器交互 | 4-6 | pass | 同一状态控制器与键盘焦点 |
| 移动端保持阅读顺序 | 390px | 浏览器截图与无溢出 | 7 | pass | 390×844 无横向溢出 |
| 动效和图片可降级 | reduce / asset error | 浏览器状态 | 8 | pass | reduced-motion 与 assets=off 均可读 |
| 能力进入生成器与示例区 | composer / examples | 单元与浏览器测试 | 9 | pass | 契约选择、构建提示和示例入口已接入 |

## 验收证据

- 原型：pages/v2/prototypes/identity-evidence/
- 桌面、移动与降级证据：.artifacts/v2-identity-evidence-r10/
- 单元测试：身份能力与创意契约共 8 条通过。
- 浏览器测试：原型 3 条、V2 工作台接入 1 条通过。
- 工程检查：TypeScript 无错误；Pages 生产构建通过。
- 能力晋级：identity-through-evidence 从 E3 晋级 E4。

## 停止

原型证明上述契约后停止。不会继续追加第四种证据、真实后端、素材生成或自由视觉精修。
