import { reactive } from "vue";
export interface ToastItem {
  id: number;
  tone: "ok" | "bad" | "info";
  text: string;
}
const items = reactive<ToastItem[]>([]);
let next = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
export function clearToasts() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  items.splice(0);
}
function push(tone: ToastItem["tone"], text: string, ms = 3200) {
  const id = next++;
  items.push({ id, tone, text });
  const timer = setTimeout(() => {
    timers.delete(id);
    const at = items.findIndex((t) => t.id === id);
    if (at >= 0) items.splice(at, 1);
  }, ms);
  timers.set(id, timer);
}
export function useToast() {
  return {
    success: (text: string) => push("ok", text),
    error: (text: string) => push("bad", text, 6000),
    info: (text: string) => push("info", text),
  };
}
export const toastItems = items;
