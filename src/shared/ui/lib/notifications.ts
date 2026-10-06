/** 通知中心的共用状态：业务调用 notify() 添加通知，铃铛显示未读数。刷新页面后清空。 */
import { reactive, computed } from "vue";
export interface Notice { id: number; title: string; text?: string; time: string; read: boolean; to?: string }
const items = reactive<Notice[]>([]);
let next = 1;
export function notify(n: { title: string; text?: string; to?: string }) {
  items.unshift({ id: next++, time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }), read: false, ...n });
  if (items.length > 50) items.pop();
}
export function useNotices() {
  return {
    items,
    unread: computed(() => items.filter((n) => !n.read).length),
    markAllRead: () => items.forEach((n) => (n.read = true)),
    clear: () => items.splice(0),
  };
}
