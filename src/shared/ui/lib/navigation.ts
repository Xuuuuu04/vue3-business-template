import type { NavItem } from "./types";

/** 找出最具体的当前页；相同地址优先选子项，父目录只标记所属位置。 */
export function currentNavItem(
  items: NavItem[],
  path: string,
): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of items) {
    if (
      item.to &&
      (path === item.to || (!item.exact && path.startsWith(item.to + "/")))
    ) {
      if (!best || item.to.length >= (best.to?.length ?? 0)) best = item;
    }
    const child = currentNavItem(item.children ?? [], path);
    if (child && (!best || child.to!.length >= (best.to?.length ?? 0)))
      best = child;
  }
  return best;
}

/** 当前页的祖先目录随路由打开；不把相邻前缀误当成子页面。 */
export function containsNavItem(item: NavItem, current?: NavItem): boolean {
  return (
    item === current ||
    (item.children ?? []).some((child) => containsNavItem(child, current))
  );
}
