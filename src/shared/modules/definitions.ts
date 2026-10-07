/** 开发包清单，也是页面、动作、接口与文件检查的共同入口。 */
import type { Component } from "vue";
import type { Action } from "@/shared/actions/definitions";
import type { Endpoint } from "@/shared/http/client";
export interface Page {
  id: string;
  title: string;
  /** 此页唯一的主要任务，用一句话说明用户要得到什么。 */
  task?: string;
  path: string;
  file: string;
  permission?: string;
  actions: string[];
  components: string[];
  load: () => Promise<{ default: Component }>;
}
/** 菜单只引用已登记页面；详情页等带参数的地址不直接进入侧栏。 */
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
  /** 侧栏图标的名称，可选值见 src/shared/ui/lib/icons.ts；不填用默认图标。 */
  icon?: string;
  dependsOn: string[];
  files: string[];
  pages: Page[];
}
export interface BusinessModule extends ModuleMetadata {
  actions: Action<any, any>[];
  endpoints: Endpoint[];
}
/** 应用启动只读取登记信息，业务计算随页面进入再加载。 */
export interface Module extends ModuleMetadata {
  load: () => Promise<Pick<BusinessModule, "actions" | "endpoints">>;
}
/** 清单不扫描任意目录注册，只有主代理登记的开发包才会被使用。 */
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

/** 开发检查读取完整定义，页面和主代理总图使用已经生成的数据。 */
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

/** 禁用未知包或仍被启用包依赖的包时拒绝启动。 */
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
