import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const label = `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`
  return <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
    {resolvedTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
  </Button>
}
