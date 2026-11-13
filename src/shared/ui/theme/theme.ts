import { reactive, readonly } from "vue";
import { readStorage, writeStorage } from "../lib/storage";
import {
  paletteById,
  type Density,
  type Mode,
  type Radius,
  type SidebarStyle,
  type Texture,
} from "./presets";

export interface ThemeSettings {
  palette: string;
  mode: Mode;
  radius: Radius;
  density: Density;
  sidebar: SidebarStyle;
  texture: Texture;

  brandHue: number | null;
}

const STORAGE_KEY = "ui-theme";

let defaults: ThemeSettings = {
  palette: "graphite",
  mode: "light",
  radius: "soft",
  density: "comfortable",
  sidebar: "light",
  texture: "plain",
  brandHue: null,
};
const state = reactive<ThemeSettings>({ ...defaults });

export function applyTheme(
  settings: ThemeSettings,
  root: HTMLElement = document.documentElement,
) {
  const p = paletteById(settings.palette);
  const set = (name: string, value: string) =>
    root.style.setProperty(name, value);
  set("--n-h", String(p.neutralHue));
  set("--n-c", String(p.neutralChroma));
  set("--b-h", String(settings.brandHue ?? p.brandHue));

  const inverseInk =
    p.id === "ink" && settings.mode === "dark" && settings.brandHue === null;
  set("--b-l", String(inverseInk ? 0.92 : p.brandLightness));
  set(
    "--b-c",
    String(
      inverseInk
        ? 0.006
        : settings.brandHue === null
          ? p.brandChroma
          : Math.max(p.brandChroma, 0.14),
    ),
  );
  set("--on-primary", inverseInk ? "oklch(0.2 0.01 265)" : p.onPrimary);
  root.dataset.mode = settings.mode;
  root.dataset.radius = settings.radius;
  root.dataset.density = settings.density;
  root.dataset.sidebar = settings.sidebar;
  root.dataset.texture = settings.texture ?? "plain";
}

function load(): Partial<ThemeSettings> {
  const raw = readStorage(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<ThemeSettings>;
  } catch (error) {
    console.warn("外观设置格式异常，已使用默认外观。", error);
    return {};
  }
}

function save() {
  writeStorage(
    STORAGE_KEY,
    JSON.stringify(state),
    "浏览器无法保存外观设置，刷新后会恢复默认设置。",
  );
}

export function initTheme() {
  Object.assign(state, defaults, load());
  applyTheme(state);
}

export function setDefaultTheme(next: Partial<ThemeSettings>) {
  defaults = { ...defaults, ...next };
}

export function useTheme() {
  function choosePalette(id: string) {
    const p = paletteById(id);
    Object.assign(state, {
      palette: id,
      mode: p.mode,
      sidebar: p.sidebar,
      brandHue: null,
    });
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
