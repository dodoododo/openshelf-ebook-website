import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  // Wait for the isolated backend's first security/CSRF request, not just Vite's HTML response.
  await expect.poll(async () => {
    try { return (await page.request.get("/api/v1/auth/csrf", { timeout: 5_000 })).status() }
    catch { return 0 }
  }, { timeout: 20_000 }).toBe(200)
})

test("register, login, reload, current user, logout, and protected route denial", async ({ page, context }) => {
  const email = `browser-${Date.now()}@example.com`
  const password = "A long browser test passphrase"
  await page.goto("/account")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole("link", { name: "Create account", exact: true }).click()
  await page.getByLabel("Display name").fill("Browser Reader")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Account created")
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401)
  const anonymousId = (await context.cookies()).find((cookie) => cookie.name === "openshelf-session")?.value
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
  const cookie = (await context.cookies()).find((entry) => entry.name === "openshelf-session")
  expect(cookie?.value).not.toBe(anonymousId)
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe("Lax")
  await page.reload()
  await expect(page.getByText("Browser Reader", { exact: true })).toBeVisible()
  await expect(page.getByText(email, { exact: true })).toBeVisible()
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200)
  expect((await page.request.post("/api/v1/auth/logout")).status()).toBe(403)
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })))
    .toEqual({ local: 0, session: 0 })
  expect(await page.evaluate(() => document.cookie)).not.toContain("openshelf-session")
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401)
  await page.goto("/account")
  await expect(page).toHaveURL(/\/login$/)
})

test("mobile registration validation stays visible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/register")
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText("Use 15–128 characters for your password.")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
