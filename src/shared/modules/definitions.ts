import type { Component } from "vue";
import type { Action } from "@/shared/actions/definitions";
import type { Endpoint } from "@/shared/http/client";
export interface Page {
  id: string;
  title: string;

  task?: string;
  path: string;
  file: string;
  permission?: string;
  actions: string[];
  components: string[];
  load: () => Promise<{ default: Component }>;
}

export interface ModuleNavigation {
  label: string;
  page?: string;
  children?: ModuleNavigation[];
}
export interface ModuleMetadata {
  navigation?: ModuleNavigation[];
  name: string;
  title: string;
  description: string;

  icon?: string;
  dependsOn: string[];
  files: string[];
  pages: Page[];
}
export interface BusinessModule extends ModuleMetadata {
  actions: Action[];
  endpoints: Endpoint[];
}

export interface Module extends ModuleMetadata {
  load: () => Promise<Pick<BusinessModule, "actions" | "endpoints">>;
}

export function defineModule(module: Module): Module {
  function validate(items: ModuleNavigation[]) {
    for (const item of items) {
      if (!item.page && !item.children?.length)
        throw new Error(`${module.name} 菜单 ${item.label} 没有页面或子菜单`);
      if (
        item.page &&
        !module.pages.some((p) => p.id === item.page && !p.path.includes(":"))
      )
        throw new Error(
          `${module.name} 菜单 ${item.label} 必须引用已登记的固定页面`,
        );
      validate(item.children ?? []);
    }
  }
  validate(module.navigation ?? []);
  return Object.freeze(module);
}

export async function loadBusinessModules(
  modules: Module[],
): Promise<BusinessModule[]> {
  return Promise.all(
    modules.map(async ({ load, ...metadata }) => ({
      ...metadata,
      ...(await load()),
    })),
  );
}

export function validateEnabledModules<
  T extends Pick<ModuleMetadata, "name" | "dependsOn">,
>(modules: T[], disabled: Set<string>) {
  for (const name of disabled)
    if (!modules.some((module) => module.name === name))
      throw new Error(`禁用模块 ${name} 未登记`);
  const enabled = modules.filter((module) => !disabled.has(module.name));
  for (const module of enabled)
    for (const dependency of module.dependsOn)
      if (disabled.has(dependency))
        throw new Error(`模块 ${module.name} 仍依赖已关闭模块 ${dependency}`);
  return enabled;
}
