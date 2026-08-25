# V2-M0 · Preserve & Pack Family Proof Delivery Contract

## 状态

DONE

## 目标

在不改变 Kindergrimm 2D v1 发布身份的前提下，整理 v2 宏观路线，并交付第二个可生产、可验证、可消费的 Content Pack，证明平台可以从单包扩展为风格族。

## 范围

- 保留 releases/kindergrimm-2d-v1/ 和全部 v1 verifier。
- 新增纯数据 Pack family profile 与派生函数。
- 新增 moonharbor-core-2d。
- 让确定性核心按 Renderer capability 处理 biped base，不再特判某个 Pack ID。
- 在 NPC Factory、运行场景和 Production Studio 导航暴露扩展入口。
- 建立 v2 Program 与下一结构 Renderer delivery contract。

## 边界

- Moonharbor 只改变 palette、身份词汇、用途语义、来源和展示信息。
- 它共享 Mosslight Core 的结构、部件、绘制函数和动画协议，因此不是独立 Renderer。
- 本里程碑不加入 LLM、云 API、账号、后端或 3D。

## 验收矩阵

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| v1 release identity 不变 | PASS | scripts/verify-release.mjs |
| family profile 可重复派生 | PASS | scripts/verify-v2-m0.mjs |
| 新 Pack 通过现有 Content Pack contract | PASS | v2.family.contract |
| 新 Pack 与基线共享结构、拥有不同视觉指纹 | PASS | v2.family.lineage |
| palette 篡改被 fingerprint 拒绝 | PASS | v2.family.tamper |
| Factory 可选择、生成、审计和打包 | PASS | browser evidence |
| Runtime 三场景可消费同一批身份 | PASS | browser evidence |
| 390px、reduced-motion、WebGL-off 保持可操作 | PASS | browser evidence |
| 下一里程碑已锁定 | PASS | v2-m1-structural-style-backend-delivery-contract.md |

## 最终证据

- v1：Release df8ac08c、Pack a96d877a、Renderer 32d9c2cf，完整 verifier 8/8。
- v2 family：Pack c0b9efd3、共享 Renderer id mosslight-core-2d、派生 descriptor 708e0f87。
- Factory：12/12 unique、23/23 authored planes、0 upstream、确定性 PASS。
- Bundle：347,158 bytes；manifest.json、spritesheet.png、content-pack.json 三项均 stored + CRC PASS。
- Runtime：8 actors、184 authored planes、0 upstream、186 draw calls；Waystation / Encounter / Council 身份完全一致。
- Product：390px 无横向溢出；reduced-motion 命中；WebGL-off 仍保留 12 assets、Pack 和 fingerprints。
- 研究站：V1 FROZEN · V2 ACTIVE、V2-M1 ACTIVE、桌面/390 无溢出、0 broken images。

浏览器证据：

- evidence/v2-m0-moonharbor-factory-desktop.png
- evidence/v2-m0-moonharbor-factory-mobile.png
- evidence/v2-m0-moonharbor-factory-webgl-off.png
- evidence/v2-m0-moonharbor-runtime-desktop.png
- evidence/v2-program-portfolio-mobile.png

## 交付文件

- runtime/content-pack-family.js
- runtime/content-packs.js
- runtime/npc-core.js
- npc-factory/
- npc-scenarios/
- production-studio/index.html
- PROGRAM-V2.md
- scripts/verify-v2-m0.mjs

## 退出结论

V2-M0 只证明“一个稳定结构 Renderer 可以形成多个受合同约束的 Content Pack”。真正的多 Renderer 平台证据由 V2-M1 负责。
