/** 从模块清单和函数位置导出 AI 图入口；规则说明仍由人和主代理维护。 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { modules } from "../src/app/catalog";
import { loadBusinessModules } from "../src/shared/modules/definitions";
import { describe } from "../src/shared/modules/graph";
import { sourceIndex } from "./inspect";
import { direct, sourceFingerprint } from "./lib";
export async function documentation() {
  const sources = sourceIndex();
  const graph = describe(
    await loadBusinessModules(modules),
    (id) => sources[id],
  );
  for (const module of graph)
    for (const action of module.actions)
      for (const step of action.steps) step.source = sources[step.id];
  const docs: Record<string, string> = {
    "src/generated/version.json":
      JSON.stringify(
        { sourceFingerprint: sourceFingerprint().slice(0, 16) },
        null,
        2,
      ) + "\n",
    "src/generated/sources.json": JSON.stringify(sources, null, 2) + "\n",
    "src/generated/graph.json": JSON.stringify(graph, null, 2) + "\n",
  };
  docs["doc/structure.md"] =
    "# 开发包与页面\n\n这份文件来自实际登记内容。运行是否成功，使用 project 命令和浏览器运行详情查看。\n\n" +
    graph
      .map(
        (m) =>
          `## ${m.title}\n\n${m.description}\n\n入口：${m.source}\n\n依赖：${m.dependsOn.join("、") || "无"}\n\n| 页面 | 路径 | 源码 | 动作 |\n| --- | --- | --- | --- |\n${m.pages.map((p) => `| ${p.title} | ${p.path} | ${p.file} | ${p.actions.join("、")} |`).join("\n")}\n`,
      )
      .join("\n");
  for (const module of graph) {
    docs[`doc/${module.name}/flows.md`] =
      `# ${module.title}计算图\n\n由实际步骤和接口生成。字段原值默认不进入运行记录。\n\n` +
      module.actions
        .map((action) => {
          const nodes = action.steps
            .map((step, index) => `  s${index}["${step.title}"]`)
            .join("\n");
          const edges = action.steps
            .slice(1)
            .map((_, index) => `  s${index} --> s${index + 1}`)
            .join("\n");
          return `## ${action.title}\n\n编号：${action.id}\n\n\`\`\`mermaid\nflowchart TD\n${nodes}\n${edges}\n\`\`\`\n\n| 步骤 | 读取 | 产出 | 接口 | 规则 | 函数位置 |\n| --- | --- | --- | --- | --- | --- |\n${action.steps.map((s) => `| ${s.title} | ${s.reads.join("、")} | ${s.writes.join("、")} | ${s.uses.join("、")} | ${s.rule} | ${s.source ? `${s.source.file}:${s.source.line} ${s.source.symbol}` : "未找到"} |`).join("\n")}\n`;
        })
        .join("\n") +
      "\n## 接口\n\n| 接口 | 方法 | 路径 |\n| --- | --- | --- |\n" +
      module.endpoints
        .map((e) => `| ${e.title} | ${e.method} | ${e.path} |`)
        .join("\n") +
      "\n";
  }
  return docs;
}
/** 只由源码指纹算出的派生文件，和登记无关：本机检查、开发守卫和打包自己重新生成。 */
const derived = new Set(["src/generated/version.json"]);
/**
 * 本机检查用：派生文件不同就直接重写，和登记有关的生成内容只比较，返回需要运行 docs 的文件。
 * docs --check 仍然逐个比较全部文件，留给 CI。
 */
export async function refreshDerived() {
  const stale: string[] = [];
  for (const [file, content] of Object.entries(await documentation())) {
    if (existsSync(file) && readFileSync(file, "utf8") === content) continue;
    if (derived.has(file)) {
      mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
      writeFileSync(file, content);
    } else stale.push(file);
  }
  return stale;
}
export async function exportDocs(check = false) {
  const expected = await documentation();
  const errors: string[] = [];
  for (const [file, content] of Object.entries(expected)) {
    if (check) {
      if (!existsSync(file) || readFileSync(file, "utf8") !== content)
        errors.push(`${file} 需要重新生成：请运行 npm run docs`);
    } else {
      mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
      writeFileSync(file, content);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return Object.keys(expected);
}
if (direct(fileURLToPath(import.meta.url))) {
  await exportDocs(process.argv.includes("--check"));
  console.log(
    process.argv.includes("--check")
      ? "生成内容与代码一致。"
      : "已生成图、函数位置和模块说明。",
  );
}
