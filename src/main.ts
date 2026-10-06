import { createApp, nextTick } from "vue";
import App from "./app/App.vue";
import { router } from "./app/router";
import "@fontsource-variable/inter/wght.css";
import "./shared/ui/theme/tokens.css";
import { initTheme, setDefaultTheme } from "./shared/ui/public";
import { appConfig } from "./app/app.config";
setDefaultTheme(appConfig.theme);
initTheme();
import { setAuthorization } from "./shared/actions/runtime";
import { useSession } from "./shared/public";
setAuthorization(useSession().can);
import { startPerformance, recordSignal } from "./shared/records/performance";
const stopPerformance = startPerformance();
let navigationStarted = performance.now();
router.beforeEach(() => {
  navigationStarted = performance.now();
});
router.afterEach(async (to) => {
  await nextTick();
  recordSignal(
    "navigation-dom",
    to.path,
    performance.now() - navigationStarted,
  );
  document.title = `${String(to.meta.title || "工作台")} · ${appConfig.name}`;
});
if (import.meta.hot) import.meta.hot.dispose(stopPerformance);
const app = createApp(App);
app.config.performance = import.meta.env.DEV;
app.config.errorHandler = (error) => {
  console.error("页面执行错误", error);
};
app.use(router).mount("#app");
