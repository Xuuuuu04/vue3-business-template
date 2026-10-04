/** 读取浏览器导出的实际记录，为接手代理提供限定动作的中文报告。 */
import { readFileSync } from "node:fs";
import { z } from "zod";
const args = process.argv.slice(2);
const fi = args.indexOf("--file");
if (fi < 0 || !args[fi + 1])
  throw new Error(
    "先从运行页面导出 JSON，再用 npm run runs -- --file 文件路径 [--run 运行编号] [--json]",
  );
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
const report = z
  .object({ removed: z.number(), runs: z.array(Run) })
  .parse(JSON.parse(readFileSync(args[fi + 1]!, "utf8")));
const ri = args.indexOf("--run");
const selected =
  ri < 0 ? report.runs : report.runs.filter((run) => run.id === args[ri + 1]);
if (!selected.length) throw new Error("没有找到指定运行");
if (args.includes("--json"))
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
      for (const output of step.outputs) console.log(`    ${output}`);
      if (step.error) console.log(`    ${step.error}`);
      for (const request of step.requests)
        console.log(
          `    ${request.method} ${request.endpoint} ${request.status || request.outcome} ${request.elapsed.toFixed(1)} ms 后台 ${request.backendRun || "未返回编号"}`,
        );
    }
  }
}
