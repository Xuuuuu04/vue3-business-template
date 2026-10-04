/** 浏览器真实性能事件独立记录，不把动作计算时间误当作渲染时间。 */
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
  for (const type of ["paint", "longtask", "resource"]) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
      gaps.value.push(`当前浏览器不支持 ${type}`);
      continue;
    }
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        recordSignal(type, entry.name, entry.duration);
    });
    observer.observe({ type, buffered: true });
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
