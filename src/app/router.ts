/** 只有登记页面进入路由，未知页面显示明确入口，返回时恢复滚动位置。 */
import { createRouter, createWebHistory } from "vue-router";
import { validateEnabledModules } from "@/shared/modules/definitions";
import { useSession } from "@/shared/public";
import { modules } from "./catalog";
const disabled = new Set<string>(
  (import.meta.env.VITE_DISABLED_MODULES || "").split(",").filter(Boolean),
);
export const enabledModules = validateEnabledModules(modules, disabled);
export const consoleEnabled =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_CONSOLE === "true";
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: () => enabledModules[0]?.pages[0]?.path || "/welcome",
    },
    ...enabledModules.flatMap((module) =>
      module.pages.map((page) => ({
        path: page.path,
        name: page.id,
        component: page.load,
        meta: {
          title: page.title,
          module: module.name,
          permission: page.permission,
        },
      })),
    ),
    { path: "/forbidden", component: () => import("./ForbiddenPage.vue") },
    { path: "/welcome", component: () => import("./WelcomePage.vue") },
    { path: "/settings", component: () => import("./SettingsPage.vue"), meta: { title: "偏好设置" } },
    { path: "/login", component: () => import("./LoginPage.vue"), meta: { title: "登录" } },
    { path: "/legal/:kind(terms|privacy)", component: () => import("./LegalPage.vue"), meta: { title: "协议与政策" } },
    ...(consoleEnabled
      ? [
          { path: "/dev", component: () => import("./dev/DevHome.vue"), meta: { title: "接入与说明" } },
          { path: "/dev/map", component: () => import("./dev/FeatureMap.vue"), meta: { title: "功能地图" } },
          { path: "/dev/records", component: () => import("./dev/Records.vue"), meta: { title: "操作记录" } },
          { path: "/dev/speed", component: () => import("./dev/Speed.vue"), meta: { title: "页面速度" } },
          { path: "/dev/design", component: () => import("./dev/DesignGuide.vue"), meta: { title: "设计预览" } },
          { path: "/system/console", redirect: "/dev/map" },
          { path: "/system/components", redirect: "/dev/design" },
        ]
      : []),
    { path: "/:pathMatch(.*)*", component: () => import("./NotFoundPage.vue") },
  ],
  scrollBehavior(_to, _from, saved) {
    return saved || { top: 0 };
  },
});

router.beforeEach((to) => {
  const session = useSession();
  if (to.meta.permission && !session.can(String(to.meta.permission)))
    return session.state.value.signedIn ? "/forbidden" : "/login";
  return true;
});
