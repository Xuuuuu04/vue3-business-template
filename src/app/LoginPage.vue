<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useSession } from "@/shared/public";
import { AuthLayout, Stack, Field, StatusMessage, UiInput, UiButton } from "@/shared/ui/public";
const router = useRouter();
const session = useSession();
const draft = reactive({
  org_code: import.meta.env.VITE_ORG_ID || "",
  username: "",
  password: "",
  otp_code: "",
});
const busy = ref(false);
const error = ref("");
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await session.login({ ...draft });
    draft.password = "";
    void router.push("/");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "登录失败";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AuthLayout brand="木木工作台" mark="木" tagline="打开就能做事，每一步都看得见结果。">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight">登录账号</h1>
    <form @submit.prevent="submit">
      <Stack>
        <Field label="组织代码" for="org"><UiInput id="org" v-model="draft.org_code" size="lg" autocomplete="organization" /></Field>
        <Field label="账号" for="username"><UiInput id="username" v-model="draft.username" size="lg" autocomplete="username" /></Field>
        <Field label="密码" for="password"><UiInput id="password" v-model="draft.password" size="lg" type="password" autocomplete="current-password" /></Field>
        <Field label="两步验证码" for="otp" hint="未开启可留空"><UiInput id="otp" v-model="draft.otp_code" size="lg" autocomplete="one-time-code" /></Field>
        <StatusMessage :status="error ? 'error' : 'idle'" :error="error" />
        <UiButton type="submit" variant="primary" size="lg" :loading="busy">登录账号</UiButton>
      </Stack>
    </form>
  </AuthLayout>
</template>
