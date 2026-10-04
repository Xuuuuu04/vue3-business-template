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
    { path: "/login", component: () => import("./LoginPage.vue") },
    ...(consoleEnabled
      ? [
          {
            path: "/system/console",
            component: () => import("./ConsolePage.vue"),
          },
          {
            path: "/system/components",
            component: () => import("./ComponentsPage.vue"),
          },
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
