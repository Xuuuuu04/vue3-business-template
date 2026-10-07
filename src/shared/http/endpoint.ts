/** 开发检查和实际发送共用路径与资源范围，URL 归一化不能越过 /api/。 */
interface EndpointRules { path: string; timeoutMs?: number; maxResponseBytes?: number }
export function endpointProblems(endpoint: EndpointRules): string[] {
  const problems: string[] = [];
  try {
    const parsed = new URL(endpoint.path, "https://template.invalid");
    if (parsed.origin !== "https://template.invalid" || !parsed.pathname.startsWith("/api/") ||
      parsed.pathname !== endpoint.path || parsed.search || parsed.hash || endpoint.path.includes("\\"))
      problems.push("接口必须使用当前站点的 /api/ 路径，不能包含点段、查询串或主机。");
  } catch { problems.push("接口路径无法识别。"); }
  for (const [name, value, maximum] of [
    ["请求期限", endpoint.timeoutMs, 300_000],
    ["响应上限", endpoint.maxResponseBytes, 256 * 1024 * 1024],
  ] as const)
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0 || value > maximum))
      problems.push(`${name}必须是有限的正整数，且不超过 ${maximum}。`);
  return problems;
}
