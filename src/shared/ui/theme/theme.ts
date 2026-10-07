/** 主题设置：应用到 <html>、保存在浏览器、供界面切换。保存失败时仍可正常显示。 */
import { reactive, readonly } from "vue";
import { paletteById, type Density, type Mode, type Radius, type SidebarStyle } from "./presets";

export interface ThemeSettings {
  palette: string;
  mode: Mode;
  radius: Radius;
  density: Density;
  sidebar: SidebarStyle;
  /** 自定义品牌色相；为空时使用配色自带的品牌色。 */
  brandHue: number | null;
}

const STORAGE_KEY = "ui-theme";

/** 产品默认主题。换产品时改这里，或在初始化时调用 setDefaultTheme。 */
let defaults: ThemeSettings = {
  palette: "ink", mode: "light", radius: "soft", density: "comfortable", sidebar: "light", brandHue: null,
};
const state = reactive<ThemeSettings>({ ...defaults });

export function applyTheme(settings: ThemeSettings, root: HTMLElement = document.documentElement) {
  const p = paletteById(settings.palette);
  const set = (name: string, value: string) => root.style.setProperty(name, value);
  set("--n-h", String(p.neutralHue));
  set("--n-c", String(p.neutralChroma));
  set("--b-h", String(settings.brandHue ?? p.brandHue));
  set("--b-c", String(settings.brandHue === null ? p.brandChroma : Math.max(p.brandChroma, 0.14)));
  set("--b-l", String(p.brandLightness));
  set("--on-primary", p.onPrimary);
  root.dataset.mode = settings.mode;
  root.dataset.radius = settings.radius;
  root.dataset.density = settings.density;
  root.dataset.sidebar = settings.sidebar;
}

function load(): Partial<ThemeSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<ThemeSettings>) : {};
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 浏览器不允许保存时，本次仍然生效 */
  }
}

/** 应用入口调用一次：读取已保存主题，没有就用产品默认值。 */
export function initTheme() {
  Object.assign(state, defaults, load());
  applyTheme(state);
}

export function setDefaultTheme(next: Partial<ThemeSettings>) {
  defaults = { ...defaults, ...next };
}

export function useTheme() {
  /** 选择配色时，明暗与侧栏风格一起带上该配色的推荐值。 */
  function choosePalette(id: string) {
    const p = paletteById(id);
    Object.assign(state, { palette: id, mode: p.mode, sidebar: p.sidebar, brandHue: null });
    applyTheme(state);
    save();
  }
  function update(patch: Partial<ThemeSettings>) {
    Object.assign(state, patch);
    applyTheme(state);
    save();
  }
  function reset() {
    Object.assign(state, defaults);
    applyTheme(state);
    save();
  }
  return { settings: readonly(state), choosePalette, update, reset };
}
