<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useSession } from "@/shared/public";
import { PageFrame, UiInput, UiButton } from "@/shared/ui/public";
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
  <PageFrame
    title="登录账号"
    description="使用后端提供的组织代码和账号。登录信息只保留在当前页面，刷新后需要重新登录。"
    ><form class="form-section" @submit.prevent="submit">
      <div class="field">
        <label for="org">组织代码</label
        ><UiInput
          id="org"
          v-model="draft.org_code"
          required
          autocomplete="organization"
        />
      </div>
      <div class="field">
        <label for="username">账号</label
        ><UiInput
          id="username"
          v-model="draft.username"
          required
          autocomplete="username"
        />
      </div>
      <div class="field">
        <label for="password">密码</label
        ><UiInput
          id="password"
          v-model="draft.password"
          required
          type="password"
          autocomplete="current-password"
          show-password
        />
      </div>
      <div class="field">
        <label for="otp">两步验证码（未开启可留空）</label
        ><UiInput
          id="otp"
          v-model="draft.otp_code"
          autocomplete="one-time-code"
        />
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
      <UiButton native-type="submit" type="primary" :loading="busy"
        >登录账号</UiButton
      >
    </form></PageFrame
  >
</template>
