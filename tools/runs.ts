/** 读取浏览器导出的实际记录，为接手代理提供限定动作的中文报告。 */
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { parseArgs, usageError } from "./lib";
const usage = `用法：npm run runs -- --file 文件路径 [--run 运行编号] [--json]
  先在「开发者工具 → 操作记录」导出 JSON，再用这条命令读取。`;
const args = parseArgs(usage, {
  flags: ["--json"],
  options: ["--file", "--run"],
});
const file = args.options.get("--file");
if (!file) usageError("缺少 --file", usage);
if (!existsSync(file)) usageError(`找不到文件 ${file}`, usage);
const Step = z.object({
  id: z.string(),
  title: z.string(),
  rule: z.string(),
  status: z.string(),
  elapsed: z.number(),
  outputs: z.array(z.string()),
  requests: z.array(
    z.object({
      endpoint: z.string(),
      method: z.string(),
      elapsed: z.number(),
      outcome: z.string(),
      status: z.number().optional(),
      backendRun: z.string().optional(),
      requestId: z.string().optional(),
    }),
  ),
  source: z
    .object({ file: z.string(), line: z.number(), symbol: z.string() })
    .optional(),
  error: z.string().optional(),
  condition: z
    .object({
      title: z.string(),
      elapsed: z.number(),
      outcome: z.boolean().optional(),
      source: z
        .object({ file: z.string(), line: z.number(), symbol: z.string() })
        .optional(),
    })
    .optional(),
});
const Run = z.object({
  id: z.string(),
  action: z.string(),
  title: z.string(),
  status: z.string(),
  elapsed: z.number(),
  codeVersion: z.string(),
  gaps: z.array(z.string()),
  steps: z.array(Step),
  error: z.string().optional(),
});
let exported: unknown;
try {
  exported = JSON.parse(readFileSync(file, "utf8"));
} catch {
  usageError(`${file} 不是 JSON 文件`, usage);
}
const parsed = z
  .object({ removed: z.number(), runs: z.array(Run) })
  .safeParse(exported);
if (!parsed.success)
  usageError(
    `${file} 不是操作记录导出的文件：${parsed.error.issues[0]?.message}`,
    usage,
  );
const report = parsed.data;
const runId = args.options.get("--run");
const selected = runId
  ? report.runs.filter((run) => run.id === runId)
  : report.runs;
if (!selected.length)
  usageError(runId ? `没有找到运行 ${runId}` : `${file} 里没有运行记录`, usage);
if (args.flags.has("--json"))
  console.log(
    JSON.stringify({ removed: report.removed, runs: selected }, null, 2),
  );
else {
  console.log(`版本随各运行保存；已移除 ${report.removed} 次记录。`);
  for (const run of selected) {
    console.log(
      `\n${run.title} · ${run.status} · ${run.elapsed.toFixed(1)} ms\n编号 ${run.id} · 版本 ${run.codeVersion}`,
    );
    if (run.error) console.log(run.error);
    for (const step of run.steps) {
      console.log(
        `  ${step.title} · ${step.status} · ${step.elapsed.toFixed(1)} ms · 规则 ${step.rule}`,
      );
      if (step.source)
        console.log(
          `    ${step.source.file}:${step.source.line} ${step.source.symbol}`,
        );
      if (step.condition) {
        const condition = step.condition;
        console.log(
          `    条件 ${condition.title} · ${condition.outcome ?? "执行失败"} · ${condition.elapsed.toFixed(1)} ms`,
        );
        if (condition.source)
          console.log(
            `    ${condition.source.file}:${condition.source.line} ${condition.source.symbol}`,
          );
      }
      for (const output of step.outputs) console.log(`    ${output}`);
      if (step.error) console.log(`    ${step.error}`);
      for (const request of step.requests)
        console.log(
          `    ${request.method} ${request.endpoint} ${request.status || request.outcome} ${request.elapsed.toFixed(1)} ms 后台 ${request.backendRun || "未返回编号"}`,
        );
    }
  }
}
