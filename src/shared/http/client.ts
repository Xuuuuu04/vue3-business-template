import type { z } from "zod";
import type { RequestRecord } from "@/shared/records/store";
import { readResponse, ResponseLimitExceeded } from "./response";
import { endpointProblems } from "./endpoint";
import { fieldErrorsFrom, type FieldErrors } from "./field-errors";

export interface Endpoint {
  id: string;
  title: string;
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  responseKind?: "blob";
  response: z.ZodType;

  timeoutMs?: number;

  maxResponseBytes?: number;
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
    public fieldErrors: FieldErrors = Object.freeze(Object.create(null)),
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
let credentialVersion = 0;
export function accessVersion() {
  return credentialVersion;
}

export function setAccessToken(token: string): void {
  credentialVersion++;
  accessToken = token;
}

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
  const timeout = setTimeout(
    () => timer.abort(new Error("timeout")),
    endpoint.timeoutMs ?? 15_000,
  );
  const combined = AbortSignal.any([signal, timer.signal]);
  try {
    const reply = await transport(prepared.url, {
      method: endpoint.method,
      headers: prepared.headers,
      signal: combined,
      body: prepared.body,
      redirect: "error",
    });
    record.status = reply.status;
    const backendRun = reply.headers.get("X-Run-ID");
    record.backendRun = backendRun ? safeText(backendRun) : undefined;
    record.requestId = safeText(
      reply.headers.get("X-Request-ID") ?? prepared.requestId,
    );
    if (!reply.ok) throw await httpFailure(reply, endpoint, safeText);
    const parsed = await parseReply(reply, endpoint);
    record.outcome = "ok";
    return parsed.data as T;
  } catch (error) {
    const writing = endpoint.method !== "GET";
    if (error instanceof ResponseLimitExceeded) {
      record.outcome = writing ? "unknown" : "failed";
      throw new ActionError(
        "response_too_large",
        "返回内容超过读取上限，请缩小查询范围或分批下载。",
        writing,
      );
    }
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

function prepareRequest(endpoint: Endpoint, options: RequestOptions) {
  const problems = endpointProblems(endpoint);
  if (problems.length)
    throw new ActionError("request_invalid", problems.join(" "));
  let path = endpoint.path;
  for (const [name, value] of Object.entries(options.params ?? {}))
    path = path.replace(`:${name}`, encodeURIComponent(value));
  if (/:\w+/.test(path))
    throw new ActionError("path_missing", "接口缺少路径参数");
  const resolvedProblems = endpointProblems({ ...endpoint, path });
  if (resolvedProblems.length)
    throw new ActionError("path_invalid", resolvedProblems.join(" "));
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
  const body =
    options.body === undefined
      ? undefined
      : multipart
        ? (options.body as FormData)
        : JSON.stringify(options.body);
  if (options.body !== undefined && body === undefined)
    throw new ActionError(
      "request_invalid",
      "请求数据无法发送，请修正输入后再提交。",
    );
  return {
    url: path + (query.size ? `?${query}` : ""),
    headers,
    body,
    requestId,
  };
}

async function httpFailure(
  reply: Response,
  endpoint: Endpoint,
  safeText: (message: string) => string,
): Promise<ActionError> {
  const uncertain =
    endpoint.method !== "GET" &&
    (reply.status >= 500 || [408, 499].includes(reply.status));
  let body: Record<string, unknown>;
  try {
    const text = await (await readResponse(reply, 64 * 1024)).text();
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value))
      body = value as Record<string, unknown>;
    else body = {};
  } catch {
    body = {};
  }
  return new ActionError(
    typeof body.code === "string" ? body.code : `http_${reply.status}`,
    typeof body.message === "string"
      ? safeText(body.message)
      : `请求失败（${reply.status}）`,
    uncertain,
    uncertain ? undefined : fieldErrorsFrom(body.fields, safeText),
  );
}

async function parseReply(reply: Response, endpoint: Endpoint) {
  const blob =
    reply.status === 204
      ? undefined
      : await readResponse(
          reply,
          endpoint.maxResponseBytes ??
            (endpoint.responseKind === "blob"
              ? 32 * 1024 * 1024
              : 2 * 1024 * 1024),
        );
  let body: unknown = null;
  if (blob && endpoint.responseKind === "blob") body = blob;
  else if (blob)
    try {
      body = JSON.parse(await blob.text());
    } catch {
      throw new ActionError(
        "response_invalid",
        "接口返回的不是约定的 JSON（可能是网页或代理错误页），请检查接口地址，写入请先查询实际结果。",
        endpoint.method !== "GET",
      );
    }
  const parsed = endpoint.response.safeParse(body);
  if (!parsed.success)
    throw new ActionError(
      "response_invalid",
      "接口返回的数据格式不符合约定，请查询实际结果。",
      endpoint.method !== "GET",
    );
  return parsed;
}
