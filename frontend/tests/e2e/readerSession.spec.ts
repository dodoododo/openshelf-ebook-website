import { test, expect } from "@playwright/test"

test("reader preserves real session login, restoration, expiry and logout", async ({ page }) => {
  await expect.poll(async () => {
    try { return (await page.request.get("/api/v1/auth/csrf", { timeout: 5_000 })).status() }
    catch { return 0 }
  }, { timeout: 20_000 }).toBe(200)
  const email = `reader-${Date.now()}@example.com`
  const password = "A long reader integration passphrase"
  await page.goto("/register")
  await page.getByLabel("Display name").fill("Reader Integration")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Account created")
  await page.goto("/read/sample")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/read\/sample$/)
  await expect(page.locator('[data-page-number="1"]')).toHaveAttribute("data-rendered", "true")
  await page.getByLabel("Next page").click()
  await expect(page.locator('[data-page-number="2"]')).toHaveAttribute("data-rendered", "true")
  await page.reload()
  await expect(page.locator('[data-page-number="2"]')).toHaveAttribute("data-rendered", "true")
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200)
  // Expire the live server session using its CSRF-protected logout endpoint.
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json()).data
  expect((await page.request.post("/api/v1/auth/logout", { headers: { [csrf.headerName]: csrf.token } })).status()).toBe(204)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator(".pdf-page")).toHaveCount(0)
})
