import { readFileSync, statSync } from "node:fs";
import { safeTemplatePath } from "./template-paths";

interface RuleModule {
  name: string;
  actions: readonly {
    steps: readonly { id: string; rule: string }[];
  }[];
}
interface RuleDocument {
  declared: Set<string>;
  tests: Map<string, string[]>;
  errors: string[];
}
const ruleId = /^[A-Z][A-Z\d_-]*-\d+$/;

function ruleDocument(text: string): RuleDocument {
  const declared = new Set<string>();
  const tests = new Map<string, string[]>();
  const errors: string[] = [];
  let fence: string | undefined;
  let verifying = false;
  let table = false;
  for (const line of text.split(/\r?\n/)) {
    const marker = line.trim().match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1]![0];
      else if (marker[1]![0] === fence) fence = undefined;
      continue;
    }
    if (fence) continue;
    const declaration = line.match(
      /^\s*(?:[-*+]\s+|#{1,6}\s+)?([A-Z][A-Z\d_-]*-\d+)\s*[:：]\s*\S/,
    );
    if (declaration) {
      const id = declaration[1]!;
      if (declared.has(id)) errors.push(`业务规则 ${id} 重复声明`);
      declared.add(id);
    }
    if (/^#{1,2}\s+/.test(line)) {
      verifying = /^##\s+验证位置\s*$/.test(line);
      table = false;
    }
    if (!verifying || !line.trim().startsWith("|")) continue;
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|");
    const values = cells.map((cell) => cell.trim());
    if (values[0] === "规则" && values[1] === "测试路径") {
      table = true;
      continue;
    }
    if (!table || values.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (values.length !== 2) {
      errors.push("验证位置表必须包含规则、测试路径两列");
      continue;
    }
    const id = values[0]!.replaceAll("`", "");
    if (!ruleId.test(id)) {
      errors.push(
        `验证位置每行填写一个完整规则编号，不能写区间或合并编号：${values[0]}`,
      );
      continue;
    }
    const paths = [...values[1]!.matchAll(/`([^`]+)`/g)].map(
      (match) => match[1]!,
    );
    if (!paths.length) errors.push(`${id} 的测试路径需要写在反引号中`);
    tests.set(id, [...(tests.get(id) ?? []), ...paths]);
  }
  return { declared, tests, errors };
}

function testPathProblem(root: string, file: string): string | undefined {
  if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file))
    return `验证位置必须引用测试文件：${file}`;
  try {
    const path = safeTemplatePath(root, file);
    if (!statSync(path).isFile()) return `验证位置不是测试文件：${file}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return `验证位置的测试文件不存在：${file}`;
    return error instanceof Error ? error.message : `无法检查测试路径：${file}`;
  }
  return undefined;
}

export function inspectRuleLinks(root: string, module: RuleModule): string[] {
  const steps = module.actions.flatMap((action) => action.steps);
  if (!steps.length) return [];
  const name = `doc/${module.name}/rules.md`;
  let text: string;
  try {
    text = readFileSync(safeTemplatePath(root, name), "utf8");
  } catch (error) {
    return [
      `${module.name}：无法读取业务规则 ${name}，${error instanceof Error ? error.message : "读取失败"}`,
    ];
  }
  const document = ruleDocument(text);
  const errors = [...document.errors];
  for (const step of steps) {
    if (!step.rule) continue;
    if (!document.declared.has(step.rule)) {
      errors.push(`${step.id}：业务规则 ${step.rule} 未在 ${name} 声明`);
      continue;
    }
    if (!document.tests.get(step.rule)?.length)
      errors.push(`${step.id}：业务规则 ${step.rule} 缺少验证位置的测试路径`);
  }
  for (const [id, paths] of document.tests) {
    if (!document.declared.has(id))
      errors.push(`验证位置引用了未声明的业务规则 ${id}`);
    for (const file of paths) {
      const problem = testPathProblem(root, file);
      if (problem) errors.push(`${id}：${problem}`);
    }
  }
  return [...new Set(errors)].map((error) => `${name}：${error}`);
}
