# R17 验证与交接

## 已完成

- 当前候选可显式点击“保存当前能力”。
- 顶栏“已保存能力”显示数量，并提供打开保存结果、以此继续生成、删除记录。
- 保存结果将 Manifest 重新写入运行存储后直接打开，不需要再次调用模型。
- 检查点保存 brief、质量、provider/model、seed、run/candidate、scene plugin、production status 与 Manifest。
- 新增 `GeneratedExperienceBundle v1`：专属页面必须包含 `experience.ts`、`scene.ts`、`director.ts`、`page.css`，并接受可选 shader 与资产引用。
- 生成束拒绝路径穿越、任意网络、`eval`、`new Function`、动态未知 import 和非白名单静态 import；源代码总量限制 160 KB。

## 运行与查看

```powershell
npm run dev -- --host 127.0.0.1 --port 8143
```

打开 `http://127.0.0.1:8143/workbench.html?provider=local`，生成完成后在“当前最佳结果”区域保存；顶栏打开能力库。

## 验证结果

- `npm test`: 22 files / 59 tests passed
- `npm run build`: passed
- `npx playwright test`: 48 passed
- 新增浏览器路径：保存 → 数量更新 → 打开能力库 → 生成页链接存在 → 删除；390px 模态框无横向越界
- 既有构建警告仍为 Three.js experience chunk 650.52 KB / gzip 170.13 KB，本轮没有扩大该 chunk

## 证据

- `C:\Users\yun68\.codex\visualizations\2026\08\23\01a0304e-ca17-7101-be56-637db8b892b0\kage-r17\desktop-saved-capability.png`
- `C:\Users\yun68\.codex\visualizations\2026\08\23\01a0304e-ca17-7101-be56-637db8b892b0\kage-r17\mobile-saved-capability.png`

## 下一阶段首先做什么

让 Codex provider 返回 `GeneratedExperienceBundle`，服务端在隔离目录完成白名单校验、TypeScript 编译与超时控制，再新增按 bundle id 打开的独立预览路由。没有通过这些门禁时继续使用当前 Manifest 运行时，不冒充专属代码生成。

