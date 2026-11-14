import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// These fixtures exercise presentation states only. auth.spec.ts uses the real isolated backend.
async function fixture(page: Page, authenticated = false) {
  await page.route("**/api/v1/books/mine*", (route) => route.fulfill({ json: { success: true, data: [], pagination: { page: 0, size: 12, totalElements: 0, totalPages: 0, isLast: true } } }))
  let signedIn = authenticated
  await page.route("**/api/v1/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/csrf")) return route.fulfill({ json: { data: { headerName: "X-CSRF-TOKEN", token: "layout-test-only" } } })
    if (path.endsWith("/logout")) { signedIn = false; return route.fulfill({ status: 204 }) }
    return route.fulfill(signedIn ? { json: { data: { id: "layout-reader", displayName: "Morgan Reader", email: "morgan@example.com", role: "ROLE_USER", createdAt: "2026-11-12T00:00:00Z", updatedAt: "2026-11-12T00:00:00Z" } } } : { status: 401, json: { message: "Sign in required" } })
  })
  await page.route("**/actuator/health", (route) => route.fulfill({ json: { status: "UP" } }))
}

for (const width of [375, 768, 1280, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`reading room ${width}px ${theme}: layout, focus, contrast and screenshot`, async ({ page }, testInfo) => {
      await fixture(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
      await page.goto("/")
      await expect(page.getByRole("link", { name: "See a shelf preview" })).toBeVisible()
      await expect(page.getByRole("status")).toContainText("Live service connected")
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (width === 375) {
        await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible()
        await expect(page.getByRole("complementary")).not.toBeVisible()
      } else {
        await expect(page.getByRole("button", { name: "Open navigation" })).not.toBeVisible()
        await expect(page.getByRole("complementary")).toBeVisible()
      }
      for (const name of ["Search pages and shelves", `Switch to ${theme === "light" ? "dark" : "light"} theme`]) {
        const box = await page.getByRole("button", { name }).boundingBox()
        expect(box?.width).toBeGreaterThanOrEqual(44)
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
      await page.keyboard.press("Tab")
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused()
      expect(await page.getByRole("link", { name: "Skip to content" }).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid")
      await page.keyboard.press("Enter")
      await expect(page.getByRole("main")).toBeFocused()
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([])
      await page.getByRole("main").blur()
      await page.screenshot({ path: testInfo.outputPath(`reading-room-${width}-${theme}.png`), fullPage: true })
    })
  }
}

test("mobile drawer traps focus, closes on Escape and selection, and releases on tablet", async ({ page }) => {
  await fixture(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "Open navigation" })
  await trigger.click()
  const drawer = page.getByRole("dialog", { name: "Navigation" })
  await expect(drawer).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([])
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab")
    expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press("Escape")
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await drawer.getByRole("link", { name: "My Library" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await page.goto("/")
  await trigger.click()
  await page.setViewportSize({ width: 768, height: 1000 })
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByRole("complementary")).toBeVisible()
})

test("page search keyboard, sidebar collapse, and guest protected shelf navigation", async ({ page }) => {
  await fixture(page)
  await page.goto("/")
  await page.getByRole("button", { name: "Collapse sidebar" }).click()
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false")
  await page.keyboard.press("/")
  await expect(page.getByRole("searchbox")).toBeFocused()
  await page.getByRole("searchbox").fill("Favourites")
  await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(1)
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Search pages and shelves" }).click()
  await page.getByRole("searchbox").fill("Finished")
  await page.getByRole("dialog").getByRole("link", { name: /Finished/ }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("theme preference survives reload and auth pages, then can follow the device", async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/")
  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.getByRole("link", { name: "Sign in", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([])
  await page.getByRole("link", { name: "OpenShelf home" }).click()
  await page.getByRole("button", { name: "Use device setting" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  expect(await page.evaluate(() => localStorage.getItem("openshelf-theme"))).toBeNull()
})

test("authenticated menu, protected shelf preview, account and logout", async ({ page }) => {
  await fixture(page, true)
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).not.toBeVisible()
  await page.getByRole("link", { name: "See a shelf preview" }).click()
  await expect(page.getByRole("heading", { name: "My Library" })).toBeVisible()
  const shelves = page.getByRole("complementary").getByRole("navigation", { name: "Shelves" }).first()
  await expect(shelves.getByRole("link", { name: "My Library", exact: true })).toHaveAttribute("aria-current", "page")
  await shelves.getByRole("link", { name: "Continue Reading" }).click()
  await expect(page.getByRole("heading", { name: "Continue Reading" })).toBeVisible()
  await expect(shelves.getByRole("link", { name: "My Library", exact: true })).not.toHaveAttribute("aria-current", "page")
  await page.getByRole("button", { name: "Open account menu" }).click()
  await page.getByRole("menuitem", { name: "Your account" }).click()
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
  await page.getByRole("button", { name: "Open account menu" }).click()
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([])
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("mobile account and unavailable-session controls stay within the viewport", async ({ page }) => {
  await fixture(page, true)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole("button", { name: "Open account menu" }).click()
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ status: 503, json: { message: "Service unavailable" } }))
  await page.reload()
  await expect(page.getByRole("button", { name: "Retry account" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole("button", { name: "Open account menu" })).not.toBeVisible()
})
