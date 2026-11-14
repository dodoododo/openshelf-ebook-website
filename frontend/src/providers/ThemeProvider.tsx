import { useEffect, useLayoutEffect, useState, type ReactNode } from "react"
import { ThemeContext } from "@/contexts/ThemeContext"
import { darkModeQuery, readThemePreference, resolveTheme, themeStorageKey } from "@/lib/theme"
import type { ThemePreference } from "@/types/theme"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readThemePreference)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(darkModeQuery).matches)
  const resolvedTheme = resolveTheme(preference, systemDark)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    const media = window.matchMedia(darkModeQuery)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) setPreference(readThemePreference())
    }
    media.addEventListener("change", onChange)
    window.addEventListener("storage", onStorage)
    return () => {
      media.removeEventListener("change", onChange)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  function setTheme(theme: ThemePreference) {
    setPreference(theme)
    try {
      if (theme === "system") localStorage.removeItem(themeStorageKey)
      else localStorage.setItem(themeStorageKey, theme)
    } catch { /* A non-persistent preference is sufficient for this session. */ }
  }

  return <ThemeContext.Provider value={{ preference, resolvedTheme, setTheme,
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") }}>
    {children}
  </ThemeContext.Provider>
}
