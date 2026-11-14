import type { ResolvedTheme, ThemePreference } from "@/types/theme"

export const themeStorageKey = "openshelf-theme"
export const darkModeQuery = "(prefers-color-scheme: dark)"

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(themeStorageKey)
    if (stored === "light" || stored === "dark") return stored
  } catch { /* Appearance still works if browser storage is unavailable. */ }
  return "system"
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference
}
