/** 新产品复制框架，删除样板业务、检查历史和 Git 历史。 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  realpathSync,
  lstatSync,
} from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { protectedFiles, lockData } from "./framework-lock";
import { sourceFingerprint, filesBelow, usageError } from "./lib";
import { sourceIndex } from "./inspect";
import { assertFramework, htmlTitle } from "./scaffold";
import { safeTemplatePath } from "./template-paths";
const usage = `用法：npm run start:project -- /绝对路径/新产品 [--name 产品名称]
  不写 --name 时用目录名作产品名称。`;
const destination = process.argv[2];
if (destination === "--help" || destination === "-h") {
  console.log(usage);
  process.exit(0);
}
if (!destination || destination.startsWith("-"))
  usageError("缺少新产品目录", usage);
// 先解析已存在的祖先目录，避免用目录别名把副本建回模板内部。
let ancestor = resolve(destination);
const missing: string[] = [];
while (!existsSync(ancestor)) {
  missing.unshift(basename(ancestor));
  ancestor = dirname(ancestor);
}
const target = resolve(realpathSync(ancestor), ...missing);
const options = process.argv.slice(3);
if (options.length && (options.length !== 2 || options[0] !== "--name"))
  usageError(`不认识的参数 ${options.join(" ")}`, usage);
const productName = (options[1] ?? basename(target)).trim();
if (!productName || productName.length > 80 || /[\r\n\u0000]/.test(productName))
  throw new Error("产品名称需要 1–80 个字，不能换行");
const source = process.cwd();
assertFramework();
if (
  target === source ||
  target.startsWith(source + "/") ||
  (existsSync(target) && readdirSync(target).length)
)
  throw new Error("目标必须是本项目之外的空目录");
const entries = readdirSync(source).filter(
  (entry) =>
    !(
      [
        ".git",
        ".agents",
        "node_modules",
        "dist",
        "var",
        "playwright-report",
        "test-results",
        ".env",
        // 模板的设计说明和版本历史不进新产品，产品从自己的 0.1.0 开始记录。
        "design",
      ].includes(entry) ||
      (entry.startsWith(".env.") && entry !== ".env.example")
    ),
);
// 全部路径先检查再复制；包括不在框架摘要里的环境样例和产品素材。
for (const entry of [...entries, ".agents/skills"]) {
  const path = safeTemplatePath(source, entry);
  if (!existsSync(path)) continue;
  const files = lstatSync(path).isDirectory() ? filesBelow(path) : [path];
  for (const file of files) safeTemplatePath(source, relative(source, file));
}
mkdirSync(target, { recursive: true });
for (const entry of entries) {
  cpSync(resolve(source, entry), resolve(target, entry), { recursive: true });
}
// 本机的 .agents 内容不复制，只带项目 Skill。
if (existsSync(resolve(source, ".agents/skills")))
  cpSync(resolve(source, ".agents/skills"), resolve(target, ".agents/skills"), {
    recursive: true,
  });
const { rmSync } = await import("node:fs");
rmSync(resolve(target, "src/modules"), { recursive: true, force: true });
mkdirSync(resolve(target, "src/modules"), { recursive: true });
rmSync(resolve(target, "doc/file_library"), { recursive: true, force: true });
rmSync(resolve(target, "doc/changes.md"), { force: true });
// 样例业务检查集中在两个 demo 目录；公共检查与受保护的已知输入继续保留。
rmSync(resolve(target, "tests/demo"), { recursive: true, force: true });
rmSync(resolve(target, "tests/browser/demo"), { recursive: true, force: true });
writeFileSync(
  resolve(target, "src/app/catalog.ts"),
  `import type { Module } from '@/shared/public';\nexport const modules: Module[] = [];\n`,
);
writeFileSync(
  resolve(target, "scaffold.json"),
  JSON.stringify({ version: 1, modules: {} }, null, 2) + "\n",
);
writeFileSync(
  resolve(target, "project-plan.json"),
  JSON.stringify({ product: productName, businessLines: [] }, null, 2) + "\n",
);
/** 新产品有自己的身份，不继承样板业务宣传。 */
const brandFile = resolve(target, "src/app/app.config.ts");
let brand = readFileSync(brandFile, "utf8");
const ts = (await import("typescript")).default;
const tree = ts.createSourceFile(
  "app.config.ts",
  brand,
  ts.ScriptTarget.Latest,
  true,
);
const replacements: { start: number; end: number; text: string }[] = [];
const values: Record<string, string> = {
  name: JSON.stringify(productName),
  mark: JSON.stringify(Array.from(productName)[0]),
  logo: "undefined as string | undefined",
  tagline: "''",
  highlights: "[] as { title: string; text: string }[]",
  company: "''",
  icp: "''",
  support: "{ email: '', helpUrl: '' as string }",
  legal: "{ reviewed: false }",
};
for (const statement of tree.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (
      declaration.name.getText(tree) !== "appConfig" ||
      !declaration.initializer ||
      !ts.isObjectLiteralExpression(declaration.initializer)
    )
      continue;
    for (const property of declaration.initializer.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name.getText(tree);
      if (values[name] !== undefined)
        replacements.push({
          start: property.initializer.getStart(tree),
          end: property.initializer.end,
          text: values[name]!,
        });
    }
  }
}
if (replacements.length !== Object.keys(values).length)
  throw new Error("产品品牌配置格式无法识别");
for (const part of replacements.sort((a, b) => b.start - a.start))
  brand = brand.slice(0, part.start) + part.text + brand.slice(part.end);
writeFileSync(brandFile, brand);
const htmlFile = resolve(target, "index.html");
writeFileSync(
  htmlFile,
  readFileSync(htmlFile, "utf8").replace(
    /<title>[^<]*<\/title>/,
    `<title>${htmlTitle(productName)}</title>`,
  ),
);
const sampleEnvironment = resolve(target, ".env.example");
writeFileSync(
  sampleEnvironment,
  readFileSync(sampleEnvironment, "utf8")
    .replace(/^VITE_API_MODE=.*$/m, "VITE_API_MODE=real")
    .replace(/^VITE_ORG_ID=.*$/m, "VITE_ORG_ID="),
);
writeFileSync(
  resolve(target, "README.md"),
  `# ${productName}\n\n当前没有业务模块，登录与业务接口尚未连接真实后台。产品计划见 project-plan.json，开发入口见 AGENTS.md，页面交付见 doc/delivery.md。\n\n## 启动\n\n使用 Node.js 22.12 以上的 22.x、24.x 或 26.x。\n\n\`\`\`sh\nnpm ci\ncp .env.example .env\nnpm run dev\n\`\`\`\n\n.env 中填写真实 API_PROXY_TARGET 与 VITE_ORG_ID。开发组件和任务示例在 /dev/design、/dev/examples，仅用于比较界面，不能当作后台保存。\n\n## 开发与检查\n\n先确认业务规则，再用 new:module、new:page 生成文件。运行 npm run project -- --json 看登记与实际检查。整批交付运行 npm run docs、npm run check、npm run test:browser 与 VITE_API_MODE=real npm run build。\n\n## 登录与品牌\n\n公共登录请求 POST /api/v1/access/login，输入 org_code、username、password、otp_code。响应需有非空 access_token、Bearer token_type、正整数 expires_in 与非空 org_id；额外的用户或刷新字段不要求。访问凭据只存内存，刷新后重新登录，不保存或自动使用刷新令牌。登录声明在 src/shared/session/login.ts，后台登录及资源权限由产品实现；更换代理地址不等于已接通。\n\n产品名称已写入 app.config.ts；公司、联系方式与法律文本需按真实产品填写。默认主题沿用模板，品牌说明为空，避免继承样板业务宣传。\n`,
);
const templateVersion = (
  JSON.parse(readFileSync(resolve(source, "package.json"), "utf8")) as {
    version: string;
  }
).version;
writeFileSync(
  resolve(target, "CHANGELOG.md"),
  `# ${productName}：版本记录\n\n## 0.1.0\n\n从 Vue3 企业后台模板 ${templateVersion} 初始化，尚未完成产品业务。框架来源见 .template/source.json。\n`,
);
// 包名只能用小写字母、数字和 . _ -；中文目录名退回 frontend。
const packageName =
  basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "") || "frontend";
for (const file of ["package.json", "package-lock.json"]) {
  const path = resolve(target, file);
  if (!existsSync(path)) continue;
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    name?: string;
    version?: string;
    packages?: Record<string, { name?: string; version?: string }>;
  };
  for (const entry of [data, data.packages?.[""]])
    if (entry) Object.assign(entry, { name: packageName, version: "0.1.0" });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
/** AGENTS 开头换成产品自己的说明，后面的命令、Skill 表和约定原样保留。 */
const agentsFile = resolve(target, "AGENTS.md");
const agents = readFileSync(agentsFile, "utf8");
const firstSection = agents.indexOf("\n## ");
if (!agents.startsWith("# ") || firstSection < 0)
  throw new Error("AGENTS.md 开头格式改变，无法改写成产品说明");
writeFileSync(
  agentsFile,
  `# ${productName}\n\n${productName}的前端，从 Vue3 企业后台模板 ${templateVersion} 创建。业务按固定开发包组织，界面系统在 \`src/shared/ui\`，页面只拼装公共组件。现在还没有业务包：先填 \`project-plan.json\` 和 \`doc/包名/rules.md\`，再用 \`npm run new:module\` 创建。\n` +
    agents.slice(firstSection),
);
const originals: Record<string, string> = {};
for (const file of protectedFiles(source)) {
  const name = relative(source, file);
  originals[name] = readFileSync(file, "utf8");
}
mkdirSync(resolve(target, ".template"), { recursive: true });
writeFileSync(
  resolve(target, ".template/base.json"),
  JSON.stringify(originals, null, 2) + "\n",
);
let commit = "uncommitted";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
} catch {
  /* 没有提交时明确记录来源尚未提交。 */
}
writeFileSync(
  resolve(target, ".template/source.json"),
  JSON.stringify(
    {
      repository: "https://github.com/Xuuuuu04/vue3-business-template",
      commit,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  resolve(target, "framework.lock"),
  JSON.stringify(lockData(target), null, 2) + "\n",
);
writeFileSync(
  resolve(target, "src/generated/sources.json"),
  JSON.stringify(sourceIndex(target), null, 2) + "\n",
);
writeFileSync(resolve(target, "src/generated/graph.json"), "[]\n");
writeFileSync(
  resolve(target, "src/generated/version.json"),
  JSON.stringify(
    { sourceFingerprint: sourceFingerprint(target).slice(0, 16) },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  resolve(target, "doc/structure.md"),
  "# 开发包与页面\n\n这份文件来自实际登记内容。运行是否成功，使用 project 命令和浏览器运行详情查看。\n\n",
);
console.log(
  `新产品已创建：${target}\n进入新目录运行 npm ci、npm run docs，再用 npm run new:module -- 包名 --title 中文名 创建业务包。`,
);
