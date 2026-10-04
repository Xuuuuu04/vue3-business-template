<script setup lang="ts">
import { useRouter, RouterLink, RouterView } from "vue-router";
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { UiButton } from "@/shared/ui/public";
import { useSession } from "@/shared/public";
import { enabledModules, consoleEnabled } from "./router";
const router = useRouter();
const session = useSession();
function leaveSession() {
  session.logoutLocal();
  void router.replace("/login");
}
const identity = session.state;
</script>
<template>
  <ElConfigProvider size="large" :locale="zhCn"
    ><a href="#main" class="skip-link">跳到主要内容</a>
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          木木 · 工作台
          <p>Vue3 通用前端模板</p>
        </div>
        <nav aria-label="主要导航">
          <p class="nav-title">团队工作</p>
          <RouterLink
            v-for="module in enabledModules"
            :key="module.name"
            class="nav-link"
            :to="module.pages[0]?.path || '/'"
            >{{ module.title }}</RouterLink
          ><template v-if="consoleEnabled"
            ><p class="nav-title">开发工具</p>
            <RouterLink class="nav-link" to="/system/console"
              >结构与运行</RouterLink
            ><RouterLink class="nav-link" to="/system/components"
              >组件样板</RouterLink
            ></template
          >
        </nav>
      </aside>
      <div class="main-column">
        <header class="topbar">
          <div class="context">
            <span>团队空间</span
            ><span class="demo-badge">{{
              session.demo ? "样板演示" : identity.org
            }}</span>
          </div>
          <div v-if="!session.demo" class="action-row">
            <span>{{ identity.signedIn ? identity.username : "尚未登录" }}</span
            ><UiButton v-if="identity.signedIn" @click="leaveSession"
              >退出当前页面</UiButton
            ><RouterLink v-else to="/login">登录账号</RouterLink>
          </div>
          <span v-else class="muted">统一样式 · 清楚的操作</span>
        </header>
        <p v-if="session.demo" class="demo-note">
          当前是演示环境，文件为样板数据；关闭开发服务后不会保留。
        </p>
        <main id="main" class="main-content" tabindex="-1"><RouterView /></main>
      </div></div
  ></ElConfigProvider>
</template>
