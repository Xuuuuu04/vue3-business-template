/**
 * 前端接口登记与后端 OpenAPI 文档的对照与生成。
 * - checkEndpoints：每个登记的接口在文档里是否存在，返回字段的名称、必填与类型是否对得上。
 * - generateApi：按路径前缀生成接口登记与 Zod 类型的代码，作为写 api.ts、data.ts 的起点。
 * 只读文档，不访问后端。
 */
import type { z } from "zod";

type Json = Record<string, unknown>;
export interface OpenApi { paths: Record<string, Record<string, Json>>; components?: { schemas?: Record<string, Json> } }
export interface FrontEndpoint { id: string; method: string; path: string; responseKind?: string; response: z.ZodType }
export interface Problem { endpoint: string; kind: "missing" | "field" | "type" | "required"; message: string }

/** 前端写法 /files/:org/:id 与文档写法 /files/{org}/{id} 互换。 */
export const toOpenApiPath = (p: string) => p.replace(/:(\w+)/g, "{$1}");
export const toFrontPath = (p: string) => p.replace(/\{(\w+)\}/g, ":$1");

function resolve(spec: OpenApi, schema: Json | undefined): Json | undefined {
  let s = schema;
  for (let i = 0; s && typeof s.$ref === "string" && i < 10; i++) s = spec.components?.schemas?.[String(s.$ref).split("/").pop()!];
  return s;
}
/** 去掉 anyOf/oneOf 里的 null，返回主体与是否可空。 */
function unwrapNull(spec: OpenApi, schema: Json | undefined): { schema?: Json; nullable: boolean } {
  const s = resolve(spec, schema);
  const list = (s?.anyOf ?? s?.oneOf) as Json[] | undefined;
  if (list) {
    const rest = list.filter((x) => x.type !== "null");
    return { schema: resolve(spec, rest[0]), nullable: rest.length < list.length };
  }
  return { schema: s, nullable: Boolean(s?.nullable) };
}
export function findOperation(spec: OpenApi, method: string, path: string): Json | undefined {
  const want = toOpenApiPath(path).split("/");
  for (const [p, ops] of Object.entries(spec.paths)) {
    const have = p.split("/");
    if (have.length !== want.length) continue;
    if (have.every((seg, i) => seg === want[i] || (seg.startsWith("{") && want[i]!.startsWith("{")))) return ops[method.toLowerCase()];
  }
  return undefined;
}
function successSchema(spec: OpenApi, op: Json): { status: string; schema?: Json } {
  const responses = (op.responses ?? {}) as Record<string, Json>;
  const status = Object.keys(responses).find((c) => c.startsWith("2")) ?? "";
  const content = responses[status]?.content as Record<string, Json> | undefined;
  return { status, schema: content?.["application/json"]?.schema as Json | undefined };
}

/** Zod 类型的结构（只取对照需要的部分）。 */
function zodKind(s: z.ZodType): { type: string; inner?: z.ZodType; shape?: Record<string, z.ZodType>; element?: z.ZodType } {
  const def = (s as unknown as { def: Json }).def;
  const type = String(def.type);
  if (type === "optional" || type === "nullable" || type === "default") return { type, inner: def.innerType as z.ZodType };
  if (type === "object") return { type, shape: def.shape as Record<string, z.ZodType> };
  if (type === "array") return { type, element: def.element as z.ZodType };
  return { type };
}
const jsonTypeOf: Record<string, string[]> = { string: ["string"], number: ["number", "integer"], int: ["integer", "number"], boolean: ["boolean"], object: ["object"], array: ["array"], null: ["null"] };

function compare(spec: OpenApi, front: z.ZodType, back: Json | undefined, where: string, endpoint: string, out: Problem[]) {
  let k = zodKind(front);
  let frontOptional = false;
  while (k.inner) { frontOptional ||= k.type !== "nullable"; front = k.inner; k = zodKind(front); }
  const { schema, nullable } = unwrapNull(spec, back);
  if (!schema) return;
  const backType = String(schema.type ?? (schema.properties ? "object" : ""));
  if (k.type === "object" && k.shape) {
    if (backType !== "object") { out.push({ endpoint, kind: "type", message: `${where || "返回值"} 前端要对象，文档是 ${backType || "未声明"}` }); return; }
    const props = (schema.properties ?? {}) as Record<string, Json>;
    const required = new Set((schema.required as string[] | undefined) ?? []);
    for (const [name, sub] of Object.entries(k.shape)) {
      const path = where ? `${where}.${name}` : name;
      const subKind = zodKind(sub);
      const optional = subKind.type === "optional" || subKind.type === "default";
      if (!(name in props)) { if (!optional) out.push({ endpoint, kind: "field", message: `${path} 前端需要，文档里没有` }); continue; }
      const p = unwrapNull(spec, props[name]);
      if (!optional && !required.has(name)) out.push({ endpoint, kind: "required", message: `${path} 前端要求一定有，文档里是可选` });
      if (p.nullable && subKind.type !== "nullable" && !(subKind.inner && zodKind(subKind.inner).type === "nullable")) out.push({ endpoint, kind: "required", message: `${path} 文档允许为空（null），前端没有接受空值` });
      compare(spec, sub, props[name], path, endpoint, out);
    }
    return;
  }
  if (k.type === "array" && k.element) {
    if (backType !== "array") { out.push({ endpoint, kind: "type", message: `${where} 前端要数组，文档是 ${backType}` }); return; }
    compare(spec, k.element, schema.items as Json, `${where}[]`, endpoint, out);
    return;
  }
  const allowed = jsonTypeOf[k.type];
  if (allowed && backType && !allowed.includes(backType)) out.push({ endpoint, kind: "type", message: `${where} 前端是 ${k.type}，文档是 ${backType}` });
  void nullable;
  void frontOptional;
}

export function checkEndpoints(spec: OpenApi, endpoints: FrontEndpoint[]): Problem[] {
  const out: Problem[] = [];
  for (const e of endpoints) {
    const op = findOperation(spec, e.method, e.path);
    const label = `${e.id}（${e.method} ${e.path}）`;
    if (!op) { out.push({ endpoint: label, kind: "missing", message: "文档里没有这个接口" }); continue; }
    if (e.responseKind === "blob") continue;
    const { status, schema } = successSchema(spec, op);
    if (status === "204") {
      if (zodKind(e.response).type !== "null") out.push({ endpoint: label, kind: "type", message: "文档返回 204（没有内容），前端期待有返回值" });
      continue;
    }
    compare(spec, e.response, schema, "", label, out);
  }
  return out;
}

/** JSON Schema 转 Zod 源码。引用的组件生成具名常量。 */
function zodSource(spec: OpenApi, schema: Json | undefined, named: Map<string, string>, indent = ""): string {
  if (!schema) return "z.unknown()";
  if (typeof schema.$ref === "string") {
    const name = String(schema.$ref).split("/").pop()!;
    if (!named.has(name)) { named.set(name, ""); named.set(name, zodSource(spec, spec.components?.schemas?.[name], named)); }
    return name;
  }
  const list = (schema.anyOf ?? schema.oneOf) as Json[] | undefined;
  if (list) {
    const rest = list.filter((x) => x.type !== "null");
    const body = rest.length === 1 ? zodSource(spec, rest[0], named, indent) : `z.union([${rest.map((r) => zodSource(spec, r, named, indent)).join(", ")}])`;
    return rest.length < list.length ? `${body}.nullable()` : body;
  }
  if (schema.enum) return `z.enum([${(schema.enum as unknown[]).map((v) => JSON.stringify(v)).join(", ")}])`;
  switch (schema.type) {
    case "string": return schema.format === "date-time" ? "z.iso.datetime({ offset: true })" : schema.format === "date" ? "z.iso.date()" : "z.string()";
    case "integer": return "z.number().int()";
    case "number": return "z.number()";
    case "boolean": return "z.boolean()";
    case "array": return `z.array(${zodSource(spec, schema.items as Json, named, indent)})`;
    case "object": {
      const props = (schema.properties ?? {}) as Record<string, Json>;
      if (!Object.keys(props).length) return "z.record(z.string(), z.unknown())";
      const req = new Set((schema.required as string[] | undefined) ?? []);
      const inner = indent + "  ";
      const lines = Object.entries(props).map(([k, v]) => {
        const doc = v.description ?? v.title;
        return `${doc ? `${inner}/** ${String(doc)} */\n` : ""}${inner}${/^\w+$/.test(k) ? k : JSON.stringify(k)}: ${zodSource(spec, v, named, inner)}${req.has(k) ? "" : ".optional()"},`;
      });
      return `z.object({\n${lines.join("\n")}\n${indent}})`;
    }
    default: return "z.unknown()";
  }
}

/** 生成某个路径前缀下全部接口的登记代码；id 用 “模块名.操作编号”。 */
export function generateApi(spec: OpenApi, prefix: string, module: string): string {
  const named = new Map<string, string>();
  const endpoints: string[] = [];
  for (const [path, ops] of Object.entries(spec.paths)) {
    if (!path.startsWith(prefix)) continue;
    for (const [method, op] of Object.entries(ops)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const { status, schema } = successSchema(spec, op);
      const content = ((op.responses as Record<string, Json>)?.[status]?.content ?? {}) as Record<string, Json>;
      const binary = !content["application/json"] && Object.keys(content).length > 0;
      const response = status === "204" ? "z.null()" : binary ? "z.instanceof(Blob)" : zodSource(spec, schema, named, "    ");
      const id = `${module}.${String(op.operationId ?? `${method}_${path}`).replace(/\W+/g, "_")}`;
      endpoints.push(`  {\n    id: ${JSON.stringify(id)},\n    title: ${JSON.stringify(String(op.summary ?? id))},\n    method: ${JSON.stringify(method.toUpperCase())},\n    path: ${JSON.stringify(toFrontPath(path))},${binary ? '\n    responseKind: "blob",' : ""}\n    response: ${response},\n  },`);
    }
  }
  const types = [...named].filter(([, v]) => v).map(([k, v]) => `export const ${k} = ${v};\nexport type ${k} = z.infer<typeof ${k}>;`);
  return [
    `/** 由 npm run api -- gen 从后端接口文档生成；字段含义来自文档的说明。核对后再改成手写的 api.ts。 */`,
    `import { z, type Endpoint } from "@/shared/public";`,
    "",
    ...types.map((t) => t + "\n"),
    `export const endpoints: Endpoint[] = [`,
    ...endpoints,
    `];`,
    "",
  ].join("\n");
}
