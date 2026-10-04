/** 开发包清单，也是页面、动作、接口与文件检查的共同入口。 */
import type { Component } from "vue";
import type { Action } from "@/shared/actions/definitions";
import type { Endpoint } from "@/shared/http/client";
export interface Page {
  id: string;
  title: string;
  path: string;
  file: string;
  permission?: string;
  actions: string[];
  components: string[];
  load: () => Promise<{ default: Component }>;
}
export interface BusinessModule {
  name: string;
  title: string;
  description: string;
  dependsOn: string[];
  files: string[];
  pages: Page[];
  actions: Action<any, any>[];
  endpoints: Endpoint[];
}
/** 清单不扫描任意目录注册，只有主代理登记的开发包才会被使用。 */
export function defineModule(module: BusinessModule): BusinessModule {
  return Object.freeze(module);
}
