import type { Module, ModuleNavigation } from "@/shared/modules/definitions";
import type { NavItem } from "@/shared/ui/lib/types";

export function moduleNavigation(
  module: Module,
  can: (permission: string) => boolean,
): NavItem | undefined {
  function build(items: ModuleNavigation[]): NavItem[] {
    return items.flatMap((item) => {
      const page = module.pages.find((p) => p.id === item.page);
      const allowed = page && (!page.permission || can(page.permission));
      const children = build(item.children ?? []);
      if (!allowed && !children.length) return [];
      return [
        {
          label: item.label,
          to: allowed ? page.path : undefined,
          exact: true,
          children,
        },
      ];
    });
  }
  const children = build(module.navigation ?? []);
  const only = children.length === 1 ? children[0] : undefined;
  if (only && only.label === module.title && !only.children?.length)
    return only;
  const first = module.pages.find(
    (p) => !p.path.includes(":") && (!p.permission || can(p.permission)),
  );
  if (!children.length && !first) return undefined;
  return { label: module.title, to: first?.path, children };
}
