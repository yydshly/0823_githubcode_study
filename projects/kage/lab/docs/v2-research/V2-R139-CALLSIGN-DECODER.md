# V2 R139 · 十秒呼号解码

## Design Contract

- Entry mode：brief-led；验证一个从未使用的新想法，是否能从 V3 合同直接进入主题专属、非工作台的声音排版体验。
- Request revision：R139。
- Exact brief：为第一次参加业余无线电公开课的人设计一个「十秒呼号解码」网页。一条虚构演示电文以点划文字与合成音调同步出现，用户必须实际聆听并辨认点划节奏。点击试听按钮或按空格键播放每一段，点划在原位展开对应字母，之后提交解码；最终行动是保存这张呼号练习卡。页面像一张会发声的现代排版作品，使用明亮纸白、信号橙和墨黑。所有呼号与电文均为虚构演示。
- Target user and context：第一次参加业余无线电公开课、尚未建立点划听辨节奏的成年学习者；本页是十秒入门练习，不是业余无线电认证或真实呼号服务。
- Desired first impression：一条横跨版面的点划排字谱正在发声；当前符号按真实时值伸展，声音结束后在原位置译为字母。不是波形仪表盘、中央收音机或题卡集合。
- Visual ambition：Expressive；主视觉由排版、时值、声音和留白共同构成，不需要为“吸睛”强行升级为 3D。
- Experience architecture：Typographic Sonic Field / Editorial Flow；内容长度由一次完整练习自然形成，不固定屏数。
- Visual constraints：明亮纸白、信号橙、墨黑；点与划既是信息又是动态视觉锚点；控件只在当前声段附近出现。
- Information constraints：呼号、答案、练习结果均为项目虚构演示；不暗示官方训练、真实电台通信或认证结论。
- Operation constraints：播放按钮、分段按钮与输入框外空格键驱动同一 canonical sequence；鼠标、触摸与键盘可完成播放、解码、提交、重试和保存。
- State constraints：`waiting → sounding → decoding → checked → saved`；声音、符号位置、字母揭示、输入状态和保存卡必须来自同一状态。
- Environment constraints：沿用现有 Vite 多页；桌面、390px、reduced-motion 与强制 AudioContext fallback 都保留完整任务；不新增依赖。
- Primary journey：看见十秒点划谱 → 主动试听 → 在声音与原位揭示中辨认 → 输入并提交 → 保存练习卡。
- Required artifacts：专属合同与 author package 测试、独立页面、浏览器证据、最终 `runId + bundleHash`、DirectCreativeRun；通过才进入 V3 精选。
- Autonomy authorization：用户要求持续按小目标推进且不频繁确认；本阶段可逆实现、测试与本地归档已授权。
- User-decision boundary：后台 Codex 接入、新供应商、真实频段/呼号服务、部署与远端提交不属于 R139。

## Positive reference boundary

- 只复用已有声音能力的 AudioContext 延迟激活、音量、静音和诚实失败处理。
- 只复用语义 DOM/SVG、键盘焦点、有限状态与本地保存的工程能力。
- 不复用森林全屏声景、午夜电台工作台、胶片相机 sticky 侧栏、地图横向轨道或 WebGL 固定舞台的视觉结构。
- 参考和推断均为 advisory；当前 brief 的试听、解码、保存、虚构披露与通用质量门才是 hard。

## Coverage Manifest

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 新 brief 合同不漂移 | contract / author package | sonic field、code-native、direct input、audio route | pass | callsign 专属 beats、主输入与媒介测试通过 |
| 主题专属首屏 | desktop opening | 点划排字谱、虚构披露、试听入口 | pass | 268ms 内出现明亮声音排版场 |
| 声音与视觉同源 | interaction / audio | canonical sequence、播放前后、分段揭示 | pass | 9 个合成音与四段点划由同一序列驱动 |
| 练习任务闭环 | decoding / checked / saved | 错误重试、正确提交、保存恢复 | pass | 错误不泄露完成卡；正确结果跨重载恢复 |
| 跨表面可用 | 390px / reduced motion | screenshot、overflow、keyboard/touch | pass | 390×844 完成态无页面级横向溢出 |
| 诚实音频回退 | forced audio fallback | 无声音仍能解码、提交与保存 | pass | 明示无法发声并保留同一视觉时序与任务 |
| 最终身份 | build / evidence | runId + bundleHash；旧证据失效 | pass | `direct-r139-ten-second-callsign-decode` + `bb1cbb3a…833d6` |
| 有界执行 | attempts / stop | 1 方向、1 素材决策、1 构建、≤2 修复、≤1 精修 | pass | 零第二方向、零第二素材批次、零视觉返工后停止 |

## Stop Boundary

- 一个主题、一个创意方向、一次“无需外部主素材”的有界素材决策、一次完整构建。
- 最多两次确定性修复，最多一次依据浏览器证据的视觉精修。
- 声音与排字不同源、390px 无法完成、fallback 阻断任务或最终画面退化为普通表单时，停止为研究结果，不进入精选库。
- 不制作第二个 R139 页面，不扩展参考库，不接后台模型，不部署。

## Final result

- Stage 4 / 4：合同、专属页面、真实声音联动、自适应浏览器证据和最终身份已闭合。
- 最终页面没有采用外部图片、中央设备、固定三屏或参数工作台；点划排字、真实 Web Audio 时序和提交保存共同承担主题表达。
- 五个浏览器检查点全部通过，页面、控制台、请求与响应错误均为零。
- 视觉判断通过；没有发现值得消耗唯一精修额度的明确缺陷，因此保留首个最佳候选并停止。
- R139 证明 `code-native` 不等于低质量 CSS 图形：当产品核心就是声音、文字与时间，代码原生媒介可以形成主题专属且可验证的完成体验。
