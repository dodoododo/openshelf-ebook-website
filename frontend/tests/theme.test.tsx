import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { useTheme } from "@/hooks/useTheme"
import { themeStorageKey } from "@/lib/theme"

function Appearance() {
  const { preference, resolvedTheme, setTheme, toggleTheme } = useTheme()
  return <><output>{preference}:{resolvedTheme}</output><button onClick={toggleTheme}>Toggle</button><button onClick={() => setTheme("system")}>Device</button></>
}

describe("appearance preference", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      media: query, matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }) as unknown as MediaQueryList)
  })

  it("follows the device without writing storage and responds to device changes", async () => {
    let notify: ((event: { matches: boolean }) => void) | undefined
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      media: query, matches: true, addEventListener: (_type: string, listener: unknown) => { notify = listener as typeof notify },
      removeEventListener: vi.fn(),
    }) as unknown as MediaQueryList)
    render(<ThemeProvider><Appearance /></ThemeProvider>)
    expect(screen.getByRole("status")).toHaveTextContent("system:dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.length).toBe(0)
    act(() => notify?.({ matches: false }))
    expect(screen.getByRole("status")).toHaveTextContent("system:light")
  })

  it("restores explicit preference, persists a toggle, and can return to the device", async () => {
    localStorage.setItem(themeStorageKey, "dark")
    render(<ThemeProvider><Appearance /></ThemeProvider>)
    expect(document.documentElement.dataset.theme).toBe("dark")
    await userEvent.click(screen.getByRole("button", { name: "Toggle" }))
    expect(localStorage.getItem(themeStorageKey)).toBe("light")
    await userEvent.click(screen.getByRole("button", { name: "Device" }))
    expect(localStorage.getItem(themeStorageKey)).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("system:light")
  })

  it("updates across tabs and treats invalid saved values as the device preference", () => {
    localStorage.setItem(themeStorageKey, "invalid")
    render(<ThemeProvider><Appearance /></ThemeProvider>)
    expect(screen.getByRole("status")).toHaveTextContent("system:light")
    act(() => {
      localStorage.setItem(themeStorageKey, "dark")
      window.dispatchEvent(new StorageEvent("storage", { key: themeStorageKey }))
    })
    expect(document.documentElement.dataset.theme).toBe("dark")
  })

  it("still toggles when the browser blocks storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked") })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked") })
    render(<ThemeProvider><Appearance /></ThemeProvider>)
    await userEvent.click(screen.getByRole("button", { name: "Toggle" }))
    expect(document.documentElement.dataset.theme).toBe("dark")
  })
})
