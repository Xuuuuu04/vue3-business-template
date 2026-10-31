import { shallowRef, triggerRef, readonly } from "vue";
import version from "@/generated/version.json";
import sources from "@/generated/sources.json";

export interface Source {
  file: string;
  line: number;
  symbol: string;
}
export interface RequestRecord {
  endpoint: string;
  method: string;
  status?: number;
  elapsed: number;

  at?: number;
  backendRun?: string;
  requestId?: string;
  outcome: string;
}
export interface StepRecord {
  id: string;
  title: string;
  rule: string;
  source?: Source;
  status: "running" | "ok" | "failed" | "skipped" | "cancelled";
  elapsed: number;

  at?: number;
  outputs: string[];
  requests: RequestRecord[];
  error?: string;
  condition?: {
    title: string;
    source?: Source;
    elapsed: number;
    outcome?: boolean;
  };
}
export interface RunRecord {
  id: string;
  action: string;
  title: string;
  started: string;

  origin?: number;
  elapsed: number;
  status: "running" | "ok" | "failed" | "cancelled" | "unknown";
  steps: StepRecord[];
  error?: string;
  gaps: string[];
  codeVersion: string;
}
const MAX_RUNS = 100;
const items = shallowRef<RunRecord[]>([]);
let dropped = 0;

export function sourceOf(id: string): Source | undefined {
  return (sources as Record<string, Source>)[id];
}

export function startRecord(action: string, title: string): RunRecord {
  const record: RunRecord = {
    id: crypto.randomUUID(),
    action,
    title,
    started: new Date().toISOString(),
    origin: performance.now(),
    elapsed: 0,
    status: "running",
    steps: [],
    gaps: [],
    codeVersion:
      import.meta.env?.VITE_CODE_VERSION &&
      import.meta.env.VITE_CODE_VERSION !== version.sourceFingerprint
        ? `${import.meta.env.VITE_CODE_VERSION}/${version.sourceFingerprint}`
        : version.sourceFingerprint,
  };
  items.value = [record, ...items.value];
  if (items.value.length > MAX_RUNS) {
    const removable = items.value.findLastIndex(
      (item) => item.status !== "running",
    );
    if (removable >= 0) items.value.splice(removable, 1);
    else {
      items.value.pop();
      record.gaps.push("运行记录容量已满，部分在途运行未保留");
    }
    dropped++;
  }
  triggerRef(items);
  return record;
}

export function changed(): void {
  triggerRef(items);
}
export function clearRecords() {
  items.value = [];
  dropped = 0;
}

export function useRecords() {
  return { items: readonly(items), dropped: () => dropped };
}

export function summary(
  name: string,
  value: unknown,
  secret = false,
  recordValue = false,
): string {
  if (secret) return `${name}：已隐藏`;
  if (Array.isArray(value)) return `${name}：${value.length} 条`;
  if (value instanceof Blob) return `${name}：${value.size} 字节`;
  if (typeof value === "string")
    return recordValue
      ? `${name}：${value.slice(0, 80)}`
      : `${name}：文本 ${value.length} 字`;
  if (typeof value === "number" || typeof value === "boolean" || value == null)
    return `${name}：${String(value)}`;
  return `${name}：对象`;
}
