/** 业务模块可选的侧栏图标。模块在 module.ts 里写 icon: "folder" 这样的名字。 */
import type { Component } from "vue";
import { LayoutGrid, FolderOpen, BarChart3, Users, ShoppingCart, Package, Receipt, Settings, MessageSquare, CalendarDays, FileText, Truck, Store, Wallet, ClipboardList, Bell, Upload, Download, RefreshCw, Plus, Trash2, Pencil, Eye, Search, Filter, MoreHorizontal, ExternalLink, Copy, Check, X, ArrowLeft, Share2 } from "lucide-vue-next";

export const moduleIcons: Record<string, Component> = {
  grid: LayoutGrid, folder: FolderOpen, chart: BarChart3, users: Users, cart: ShoppingCart, package: Package,
  receipt: Receipt, settings: Settings, chat: MessageSquare, calendar: CalendarDays, document: FileText,
  truck: Truck, store: Store, wallet: Wallet, tasks: ClipboardList, bell: Bell,
};
export function moduleIcon(name?: string): Component {
  return (name && moduleIcons[name]) || LayoutGrid;
}

/** 按钮可用的图标：业务页面写 <UiButton icon="download">，不需要自己导入图标库。 */
export const actionIcons: Record<string, Component> = {
  upload: Upload, download: Download, refresh: RefreshCw, plus: Plus, delete: Trash2, edit: Pencil, view: Eye,
  search: Search, filter: Filter, more: MoreHorizontal, open: ExternalLink, copy: Copy, check: Check, close: X, back: ArrowLeft, share: Share2,
};
