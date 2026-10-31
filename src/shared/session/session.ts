import { readonly, shallowRef } from "vue";
import { ActionError, setAccessToken } from "@/shared/http/client";
import { clearRecords } from "@/shared/records/store";
import type { LoginInput } from "./login";
const state = shallowRef({
  signedIn: false,
  org:
    import.meta.env?.VITE_ORG_ID ||
    (import.meta.env?.VITE_API_MODE !== "real" ? "demo-team" : ""),
  username: "",
  permissions: [] as string[],
});
const demo = import.meta.env?.VITE_API_MODE !== "real";
let expiration: ReturnType<typeof setTimeout> | undefined;
let sessionVersion = 0;

export async function login(input: LoginInput) {
  const version = ++sessionVersion;
  const { requestLogin } = await import("./login");
  const { reply, permissions } = await requestLogin(input).catch(
    (error: unknown) => {
      if (version !== sessionVersion)
        throw new ActionError(
          "login_cancelled",
          "本次登录已取消，请重新登录。",
        );
      throw error;
    },
  );
  if (version !== sessionVersion)
    throw new ActionError("login_cancelled", "本次登录已取消，请重新登录。");
  if (state.value.signedIn) clearRecords();
  setAccessToken(reply.access_token);
  state.value = {
    signedIn: true,
    org: reply.org_id,
    username: input.username,
    permissions,
  };
  clearTimeout(expiration);
  expiration = setTimeout(
    logoutLocal,
    Math.min(reply.expires_in * 1000, 2_147_483_647),
  );
}

export function logoutLocal() {
  sessionVersion++;
  clearTimeout(expiration);
  clearRecords();
  setAccessToken("");
  state.value = {
    ...state.value,
    signedIn: false,
    username: "",
    permissions: [],
  };
}
export function useSession() {
  return {
    state: readonly(state),
    demo,
    login,
    logoutLocal,
    can: (permission: string) =>
      demo ||
      permissionAllowed(
        permission,
        state.value.signedIn,
        state.value.permissions,
      ),
  };
}

export function permissionAllowed(
  permission: string,
  signedIn: boolean,
  permissions: readonly string[],
) {
  if (permission === "public") return true;
  if (!signedIn) return false;
  return (
    permission === "signed_in" ||
    permissions.includes("*") ||
    permissions.includes(permission) ||
    permissions.includes(`${permission.split(".", 1)[0]}.*`)
  );
}
