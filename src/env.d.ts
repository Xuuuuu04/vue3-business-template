/** 公开前端配置只含模式与产品显示参数，不能包含服务密钥。 */
interface ImportMetaEnv {
  readonly VITE_API_MODE?: "demo" | "real";
  readonly VITE_ORG_ID?: string;
  readonly VITE_DISABLED_MODULES?: string;
  readonly VITE_SHOW_CONSOLE?: string;
  readonly VITE_CODE_VERSION?: string;
}
