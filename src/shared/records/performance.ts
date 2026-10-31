import { readonly, shallowRef, triggerRef } from "vue";
interface Signal {
  kind: string;
  name: string;
  duration: number;
  at: number;
}
const signals = shallowRef<Signal[]>([]);
const gaps = shallowRef<string[]>([]);
const observers: PerformanceObserver[] = [];

function resourceName(
  entry: PerformanceEntry & { initiatorType?: string },
): string {
  const initiator = entry.initiatorType;
  try {
    const url = new URL(entry.name);
    if (
      /^\/api(?:\/|$)/.test(url.pathname) ||
      initiator === "fetch" ||
      initiator === "xmlhttprequest"
    )
      return "接口请求";
    if (
      /^\/(assets|src)\//.test(url.pathname) &&
      /\.(m?js|css|ts|vue|woff2?|ttf|otf)$/.test(url.pathname)
    )
      return url.origin + url.pathname;
  } catch {
    return "资源请求";
  }
  return "资源请求";
}

export function recordBrowserEntry(
  kind: string,
  entry: PerformanceEntry & {
    initiatorType?: string;
    value?: number;
    hadRecentInput?: boolean;
    interactionId?: number;
  },
) {
  if (kind === "largest-contentful-paint")
    return recordSignal(kind, "最大内容绘制", entry.startTime);
  if (kind === "layout-shift") {
    if (!entry.hadRecentInput && entry.value)
      recordSignal(kind, "布局偏移", entry.value);
    return;
  }
  if (kind === "event") {
    if (entry.interactionId) recordSignal(kind, entry.name, entry.duration);
    return;
  }
  recordSignal(
    kind,
    kind === "resource" ? resourceName(entry) : entry.name,
    kind === "paint" ? entry.startTime : entry.duration,
  );
}

export function navigationName(route: {
  name?: string | symbol | null;
  matched: readonly { path: string }[];
}) {
  const pattern = route.matched.at(-1)?.path;
  return route.name
    ? String(route.name)
    : pattern && !pattern.includes(":pathMatch")
      ? pattern
      : "未匹配页面";
}
export function recordSignal(kind: string, name: string, duration: number) {
  signals.value.push({ kind, name, duration, at: performance.now() });
  if (signals.value.length > 200) {
    signals.value.shift();
    if (!gaps.value.includes("较早的性能记录超过容量后已移除"))
      gaps.value.push("较早的性能记录超过容量后已移除");
  }
  triggerRef(signals);
}
export function startPerformance() {
  for (const type of [
    "paint",
    "longtask",
    "resource",
    "largest-contentful-paint",
    "layout-shift",
    "event",
  ]) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
      gaps.value.push(`当前浏览器不支持 ${type}`);
      continue;
    }
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) recordBrowserEntry(type, entry);
    });
    observer.observe({
      type,
      buffered: true,
      ...(type === "event" ? { durationThreshold: 40 } : {}),
    } as PerformanceObserverInit);
    observers.push(observer);
  }
  return () => {
    for (const observer of observers) observer.disconnect();
    observers.length = 0;
  };
}
export function usePerformance() {
  return { signals: readonly(signals), gaps: readonly(gaps) };
}
