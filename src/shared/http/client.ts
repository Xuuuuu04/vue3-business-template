/** 统一请求入口：校验响应、控制超时、关联后台编号，不自动重发写入。 */
import type { z } from "zod";
import type { RequestRecord } from "@/shared/records/store";

export interface Endpoint {
  id: string;
  title: string;
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  responseKind?: "blob";
  response: z.ZodType;
}
export interface RequestOptions {
  params?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
}
export class ActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public unknownResult = false,
  ) {
    super(message);
  }
}
export interface StepTools {
  signal: AbortSignal;
  request<T>(id: string, options?: RequestOptions): Promise<T>;
  note(message: string): void;
}
export type Transport = typeof fetch;
let accessToken = "";

/** 凭据只在当前页面会话内保留，记录器不读取请求头或请求正文。 */
export function setAccessToken(token: string): void {
  accessToken = token;
}

/** 一次请求的网络持续时间包含服务器等待，不能与后台步骤耗时相加。 */
export async function sendRequest<T>(
  endpoint: Endpoint,
  options: RequestOptions,
  signal: AbortSignal,
  record: RequestRecord,
  transport: Transport = fetch,
  safeText: (message: string) => string = (message) => message.slice(0, 300),
): Promise<T> {
  let prepared: ReturnType<typeof prepareRequest>;
  try {
    prepared = prepareRequest(endpoint, options);
  } catch (error) {
    record.outcome = "failed";
    if (error instanceof ActionError) throw error;
    throw new ActionError(
      "request_invalid",
      "请求数据无法发送，请修正输入后再提交。",
    );
  }
  const started = performance.now();
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(new Error("timeout")), 15_000);
  const combined = AbortSignal.any([signal, timer.signal]);
  try {
    const reply = await transport(prepared.url, {
      method: endpoint.method,
      headers: prepared.headers,
      signal: combined,
      body: prepared.body,
    });
    record.status = reply.status;
    const backendRun = reply.headers.get("X-Run-ID");
    record.backendRun = backendRun ? safeText(backendRun) : undefined;
    record.requestId = safeText(reply.headers.get("X-Request-ID") ?? prepared.requestId);
    if (!reply.ok) {
      const uncertain =
        endpoint.method !== "GET" &&
        (reply.status >= 500 || [408, 499].includes(reply.status));
      const body = (await reply.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new ActionError(
        typeof body.code === "string" ? body.code : `http_${reply.status}`,
        typeof body.message === "string"
          ? safeText(body.message)
          : `请求失败（${reply.status}）`,
        uncertain,
      );
    }
    const body: unknown =
      reply.status === 204
        ? null
        : endpoint.responseKind === "blob"
          ? await reply.blob()
          : await reply.json();
    const parsed = endpoint.response.safeParse(body);
    if (!parsed.success)
      throw new ActionError(
        "response_invalid",
        "接口返回的数据格式不符合约定，请查询实际结果。",
        endpoint.method !== "GET",
      );
    record.outcome = "ok";
    return parsed.data as T;
  } catch (error) {
    const writing = endpoint.method !== "GET";
    if (error instanceof ActionError) {
      record.outcome = error.unknownResult ? "unknown" : "failed";
      throw error;
    }
    if (writing) {
      record.outcome = "unknown";
      throw new ActionError(
        "result_unknown",
        "请求中断，保存结果尚不能确认。请先查询结果，避免重复提交。",
        true,
      );
    }
    record.outcome = signal.aborted ? "cancelled" : "failed";
    if (signal.aborted) throw error;
    throw new ActionError(
      "network_failed",
      "网络连接失败或请求超时，可以重新读取。",
    );
  } finally {
    clearTimeout(timeout);
    record.elapsed = performance.now() - started;
  }
}

/** 在进入网络阶段前完成路径和正文准备；此时失败没有后台写入结果。 */
function prepareRequest(endpoint: Endpoint, options: RequestOptions) {
  let path = endpoint.path;
  for (const [name, value] of Object.entries(options.params ?? {}))
    path = path.replace(`:${name}`, encodeURIComponent(value));
  if (/:\w+/.test(path))
    throw new ActionError("path_missing", "接口缺少路径参数");
  const query = new URLSearchParams(
    Object.entries(options.query ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  );
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = { "X-Request-ID": requestId };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const multipart = options.body instanceof FormData;
  if (options.body !== undefined && !multipart)
    headers["Content-Type"] = "application/json";
  const body = options.body === undefined
    ? undefined
    : multipart ? options.body as FormData : JSON.stringify(options.body);
  if (options.body !== undefined && body === undefined)
    throw new ActionError("request_invalid", "请求数据无法发送，请修正输入后再提交。");
  return { url: path + (query.size ? `?${query}` : ""), headers, body, requestId };
}
