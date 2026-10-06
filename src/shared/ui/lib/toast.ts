/** 轻提示的共用状态：任何地方调用 useToast，Toaster 负责显示。 */
import { reactive } from "vue";
export interface ToastItem { id: number; tone: "ok" | "bad" | "info"; text: string }
const items = reactive<ToastItem[]>([]);
let next = 1;
function push(tone: ToastItem["tone"], text: string, ms = 3200) {
  const id = next++;
  items.push({ id, tone, text });
  setTimeout(() => {
    const at = items.findIndex((t) => t.id === id);
    if (at >= 0) items.splice(at, 1);
  }, ms);
}
export function useToast() {
  return {
    success: (text: string) => push("ok", text),
    error: (text: string) => push("bad", text, 6000),
    info: (text: string) => push("info", text),
  };
}
export const toastItems = items;
