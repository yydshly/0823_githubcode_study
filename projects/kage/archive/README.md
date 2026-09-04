# KAGE 阶段研究归档

这是 KAGE V2 在 R173 后冻结的独立、只读研究归档站。

## 结论

KAGE 已证明自然语言目标、案例研究、图像/3D/Canvas/Web Audio、专属页面构建、浏览器证据、有限修复和归档均可实现；但它尚未证明自己的“优秀判断”稳定优于大模型自由创作。规则与研究不断增加后，出现了创意趋同、形式普通、评价自证与等待过长的问题，因此停止继续扩张协议和案例数量。

归档保留的长期价值是：

- 8 类开放表达能力；
- 35 个交付案例及其成功或失败边界；
- 151 份研究文档和 33 份版本绑定运行证据；
- 关于素材职责、互动因果、真实数据、移动端、降级和有界执行的经验；
- MotionSites、本地 HTML、外部优秀产品、Threejs-3D-Webpage 与 ThreeUI 的研究记录。

## 边界

- 归档新增在 `/projects/kage/archive/`，不替换 `/projects/kage/v1/`、`/projects/kage/v2/` 或工作台。
- 页面不宣称 35 个案例全部优秀；它们按正式产品、体验参考、协议验证和阶段研究分类。
- 冻结源码位于 `codex/kage-v2-baseline-r165` 分支。
- 若未来重启，应先引入独立质量判断并验证一个真实产品 brief，而不是继续增加协议、规则或案例数量。

## 更新清单

在 `projects/kage/archive/` 运行：

```powershell
node build-manifest.mjs
```

脚本只读取冻结研究目录并重新生成 `research-manifest.json`。
