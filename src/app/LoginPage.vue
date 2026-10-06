<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Building2, User, ShieldCheck, Moon, Sun } from "lucide-vue-next";
import { useSession } from "@/shared/public";
import { AuthLayout, AppFooter, Stack, Field, StatusMessage, UiInput, UiPasswordInput, UiCheckbox, UiButton, UiDialog, UiTip, useTheme } from "@/shared/ui/public";
import { appConfig } from "./app.config";

const router = useRouter();
const session = useSession();
const { settings, update } = useTheme();
const REMEMBER_KEY = "login-account";
const draft = reactive({ org_code: import.meta.env.VITE_ORG_ID || "", username: "", password: "", otp_code: "" });
const remember = ref(true);
const useOtp = ref(false);
const busy = ref(false);
const error = ref("");
const shake = ref(false);
const forgot = ref(false);
const hasSaved = ref(false);

/** 只记住组织与账号，不保存密码；密码交给浏览器自带的密码管理（autocomplete）。 */
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null") as { org?: string; username?: string } | null;
    if (saved?.username) { draft.org_code = saved.org || draft.org_code; draft.username = saved.username; hasSaved.value = true; }
  } catch { /* 读取失败时按未记住处理 */ }
});
function persist() {
  try {
    if (remember.value) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ org: draft.org_code, username: draft.username }));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch { /* 浏览器不允许保存时，本次登录不受影响 */ }
}
const links = computed(() => [
  { label: "用户协议", to: "/legal/terms" },
  { label: "隐私政策", to: "/legal/privacy" },
  ...(appConfig.support.helpUrl ? [{ label: "帮助中心", href: appConfig.support.helpUrl }] : []),
]);
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await session.login({ ...draft });
    persist();
    draft.password = "";
    void router.push("/");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "登录失败";
    shake.value = true;
    setTimeout(() => (shake.value = false), 500);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AuthLayout :brand="appConfig.name" :mark="appConfig.mark" :logo="appConfig.logo" :tagline="appConfig.tagline" :highlights="appConfig.highlights">
    <template #topright>
      <UiTip :text="settings.mode === 'dark' ? '切换到浅色' : '切换到深色'"><UiButton variant="ghost" size="icon" :aria-label="settings.mode === 'dark' ? '切换到浅色' : '切换到深色'" @click="update({ mode: settings.mode === 'dark' ? 'light' : 'dark' })"><Sun v-if="settings.mode === 'dark'" class="size-[18px]" /><Moon v-else class="size-[18px]" /></UiButton></UiTip>
    </template>
    <h1 class="mb-8 text-[28px] leading-tight font-semibold tracking-tight">登录</h1>
    <form :class="shake && 'animate-[shake_.4s]'" @submit.prevent="submit">
      <Stack gap="md">
        <Field label="组织代码" for="org"><UiInput id="org" v-model="draft.org_code" name="organization" size="lg" autocomplete="organization" placeholder="例如 acme"><template #prefix><Building2 class="size-4" /></template></UiInput></Field>
        <Field label="账号" for="username"><UiInput id="username" v-model="draft.username" name="username" size="lg" autocomplete="username" placeholder="账号或邮箱" :autofocus="!hasSaved"><template #prefix><User class="size-4" /></template></UiInput></Field>
        <Field label="密码" for="password"><UiPasswordInput id="password" v-model="draft.password" name="password" size="lg" placeholder="输入密码" /></Field>
        <Field v-if="useOtp" label="两步验证码" for="otp"><UiInput id="otp" v-model="draft.otp_code" name="otp" size="lg" autocomplete="one-time-code" inputmode="numeric" placeholder="6 位验证码"><template #prefix><ShieldCheck class="size-4" /></template></UiInput></Field>
        <div class="flex items-center justify-between">
          <UiCheckbox v-model="remember" label="记住账号" />
          <span class="flex items-center gap-3">
            <button v-if="!useOtp" type="button" class="text-[13px] text-fg-muted hover:text-fg" @click="useOtp = true">有两步验证码？</button>
            <button type="button" class="text-[13px] text-primary-text hover:underline" @click="forgot = true">忘记密码？</button>
          </span>
        </div>
        <StatusMessage :status="error ? 'error' : 'idle'" :error="error" />
        <UiButton type="submit" variant="primary" size="lg" :loading="busy">登录</UiButton>
        <p class="text-center text-[13px] text-fg-faint">登录即表示同意<RouterLink to="/legal/terms" class="mx-0.5 text-fg-muted underline-offset-2 hover:underline">《用户协议》</RouterLink>和<RouterLink to="/legal/privacy" class="mx-0.5 text-fg-muted underline-offset-2 hover:underline">《隐私政策》</RouterLink></p>
      </Stack>
    </form>
    <template #footer><AppFooter :company="appConfig.company" :icp="appConfig.icp" :version="appConfig.version" :links="links" /></template>
    <UiDialog v-model:open="forgot" title="忘记密码" description="出于安全考虑，密码由所在组织的管理员重置。">
      <p class="text-fg-muted">请联系你的管理员，或发邮件到 <a :href="`mailto:${appConfig.support.email}`" class="text-primary-text hover:underline">{{ appConfig.support.email }}</a>，说明组织代码和账号。</p>
      <template #footer><UiButton variant="primary" @click="forgot = false">知道了</UiButton></template>
    </UiDialog>
  </AuthLayout>
</template>
