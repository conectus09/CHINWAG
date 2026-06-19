import {
  CURRENT_THEME_VERSION,
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  THEME_VERSION_KEY,
  type ThemeId,
} from "@/lib/themes";

export const THEME_CHANGE_EVENT = "chinwag-theme-change";

function ensureThemeVersion() {
  if (typeof window === "undefined") return;

  const version = localStorage.getItem(THEME_VERSION_KEY);
  if (version !== CURRENT_THEME_VERSION) {
    localStorage.setItem(THEME_VERSION_KEY, CURRENT_THEME_VERSION);
    localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
  }
}

export function readTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored && isThemeId(stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme", theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const color = getComputedStyle(root).getPropertyValue("--background").trim();
    if (color) meta.setAttribute("content", color);
  }
}

export function setTheme(theme: ThemeId) {
  localStorage.setItem(THEME_VERSION_KEY, CURRENT_THEME_VERSION);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  ensureThemeVersion();
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}