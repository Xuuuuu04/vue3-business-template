import type { NavItem } from "./types";

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

export function containsNavItem(item: NavItem, current?: NavItem): boolean {
  return (
    item === current ||
    (item.children ?? []).some((child) => containsNavItem(child, current))
  );
}
