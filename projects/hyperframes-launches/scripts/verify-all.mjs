import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const upstreamRoot = path.join(projectRoot, "upstream");
const analysisRoot = path.join(projectRoot, "analysis");
const inventory = JSON.parse(await fs.readFile(path.join(analysisRoot, "capability-matrix.json"), "utf8"));

function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function runLint(cwd) {
  const options = { cwd, encoding: "utf8", windowsHide: true, timeout: 120_000 };
  if (process.platform === "win32") {
    return spawnSync(
      "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/s", "/c", "npx.cmd --yes hyperframes@latest lint --json"],
      options,
    );
  }
  return spawnSync("npx", ["--yes", "hyperframes@latest", "lint", "--json"], options);
}

const results = [];
for (const [index, entry] of inventory.entries.entries()) {
  const cwd = path.join(upstreamRoot, ...entry.slug.split("/"));
  process.stdout.write(`[${index + 1}/${inventory.entries.length}] ${entry.slug} ... `);
  const child = runLint(cwd);
  const parsed = parseJson(child.stdout ?? "");
  const result = {
    slug: entry.slug,
    status: parsed && parsed.errorCount === 0 ? "compatible" : "incompatible",
    exitCode: child.status,
    errorCount: parsed?.errorCount ?? null,
    warningCount: parsed?.warningCount ?? null,
    infoCount: parsed?.infoCount ?? null,
    filesScanned: parsed?.filesScanned ?? null,
    cliVersion: parsed?._meta?.version ?? null,
    findingCodes: parsed ? [...new Set(parsed.findings.map((finding) => finding.code))] : [],
    parseError: parsed ? null : (child.error?.message || child.stderr || child.stdout || "No JSON output").trim().slice(0, 1000),
  };
  results.push(result);
  console.log(`${result.status} (${result.errorCount ?? "?"}E/${result.warningCount ?? "?"}W)`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  cliVersion: results.find((result) => result.cliVersion)?.cliVersion ?? null,
  total: results.length,
  compatible: results.filter((result) => result.status === "compatible").length,
  incompatible: results.filter((result) => result.status === "incompatible").length,
  errors: results.reduce((sum, result) => sum + (result.errorCount ?? 0), 0),
  warnings: results.reduce((sum, result) => sum + (result.warningCount ?? 0), 0),
};

await fs.writeFile(path.join(analysisRoot, "verification.json"), `${JSON.stringify({ summary, results }, null, 2)}\n`);
const markdown = [
  "# HyperFrames 最新 CLI 兼容性",
  "",
  `- CLI：\`${summary.cliVersion ?? "unknown"}\``,
  `- 入口：${summary.total}`,
  `- 零错误兼容：${summary.compatible}`,
  `- 存在兼容错误：${summary.incompatible}`,
  `- 合计：${summary.errors} errors / ${summary.warnings} warnings`,
  "",
  "| 入口 | 状态 | Errors | Warnings | 主要发现 |",
  "| --- | --- | ---: | ---: | --- |",
  ...results.map((result) => `| \`${result.slug}\` | ${result.status === "compatible" ? "兼容" : "需迁移"} | ${result.errorCount ?? "—"} | ${result.warningCount ?? "—"} | ${result.findingCodes.join("、") || result.parseError || "—"} |`),
  "",
  "> “需迁移”表示案例源码与当前 CLI 的规则存在差异，不表示上游发布视频无效。上游案例来自多个制作时期，部分 package.json 锁定了旧版 CLI。",
  "",
].join("\n");
await fs.writeFile(path.join(analysisRoot, "verification.md"), markdown);
console.log(JSON.stringify(summary, null, 2));
