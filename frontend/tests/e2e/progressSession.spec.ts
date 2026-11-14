import { test, expect, type Page } from "@playwright/test"
import { readFile, writeFile, unlink } from "node:fs/promises"
import { resolve } from "node:path"

const password = "A long progress browser test passphrase"
async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  const signedIn = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  expect((await signedIn).status()).toBe(200)
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto("/account")
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
}
async function register(page: Page, email: string) {
  await page.goto("/register")
  await page.getByLabel("Display name").fill("Progress Reader")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Account created")
  await login(page, email)
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
}
async function restored(page: Page) {
  await expect(page.locator('[data-page-number="4"]')).toHaveAttribute("data-rendered", "true")
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("4")
  await expect(page.getByLabel("Reading save status")).toContainText("Saved")
}

test("real PostgreSQL progress survives refresh, a new session and process restart, and stays private", async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000)
  await expect.poll(async () => {
    try { return (await page.request.get("/api/v1/auth/csrf")).status() } catch { return 0 }
  }, { timeout: 30_000 }).toBe(200)
  const first = `progress-first-${Date.now()}@example.com`
  const second = `progress-second-${Date.now()}@example.com`
  await register(page, first)
  await page.goto("/library")
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click()
  await page.getByLabel("PDF file", { exact: true }).setInputFiles(resolve("public/sample.pdf"))
  await page.getByLabel("Title", { exact: true }).fill("A private saved chapter")
  await page.getByLabel("Author", { exact: true }).fill("OpenShelf")
  const uploaded = page.waitForResponse((response) => response.url().endsWith("/api/v1/books") && response.request().method() === "POST")
  await page.getByRole("button", { name: "Upload private PDF" }).click()
  const upload = await uploaded
  expect(upload.status()).toBe(201)
  const { data: book } = await upload.json()
  const progressUrl = `/api/v1/books/${book.id}/progress`
  await page.getByRole("link", { name: "Read A private saved chapter" }).click()
  await expect(page.locator('[data-page-number="1"]')).toHaveAttribute("data-rendered", "true")
  await page.getByLabel("Page", { exact: true }).fill("4")
  await page.getByRole("button", { name: "Go", exact: true }).click()
  await restored(page)
  const confirmed = (await (await page.request.get(progressUrl)).json()).data
  expect(confirmed).toMatchObject({ currentPage: 4, furthestPage: 4, bookFileId: book.file.id, fileVersion: 1, totalPages: 5, progressPercentage: 80 })
  await page.reload()
  await restored(page)
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("progress") && key.includes(location.pathname.split("/").pop()!)))).toEqual([])
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await expect(page.getByRole("link", { name: "Resume A private saved chapter" })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("account-continue-reading.png"), fullPage: true })
  await page.getByRole("link", { name: "Resume A private saved chapter" }).click()
  await restored(page)
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("account-progress-mobile.png"), fullPage: true })
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await expect(page.getByRole("link", { name: "Resume A private saved chapter" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("account-continue-mobile.png"), fullPage: true })

  // A wholly separate browser context has no cookies, React Query cache or local progress.
  const freshContext = await browser.newContext({ baseURL: "http://127.0.0.1:5174" })
  const fresh = await freshContext.newPage()
  await login(fresh, first)
  await fresh.goto(`/read/${book.id}`)
  await restored(fresh)
  await freshContext.close()

  await logout(page)
  expect((await page.request.get(progressUrl)).status()).toBe(401)
  await register(page, second)
  await page.goto("/library")
  await expect(page.getByRole("heading", { name: "A shelf of your own." })).toBeVisible()
  await expect(page.getByRole("link", { name: "Resume A private saved chapter" })).toHaveCount(0)
  expect((await page.request.get(progressUrl)).status()).toBe(404)
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json()).data
  expect((await page.request.put(progressUrl, { headers: { [csrf.headerName]: csrf.token }, data: { bookFileId: book.file.id, currentPage: 2 } })).status()).toBe(404)
  expect((await (await page.request.get("/api/v1/library/continue-reading")).json()).data).toEqual([])
  await page.goto(`/read/${book.id}`)
  await expect(page.getByRole("heading", { name: "Book unavailable" })).toBeVisible()

  if (process.env.OPENSHELF_VERIFY_RESTART === "1") {
    const control = resolve("../backend/target/browser-control")
    await unlink(resolve(control, "restart.ready")).catch(() => {})
    await writeFile(resolve(control, "restart.request"), "restart")
    await expect.poll(async () => {
      try { return await readFile(resolve(control, "restart.ready"), "utf8") } catch { return "waiting" }
    }, { timeout: 120_000 }).toBe("ready")
    await page.goto("/account")
    await expect(page).toHaveURL(/\/login$/)
    await login(page, first)
  } else {
    await page.goto("/library")
    await logout(page)
    await login(page, first)
  }
  await page.goto("/library/continue-reading")
  await page.getByRole("link", { name: "Resume A private saved chapter" }).click()
  await restored(page)
  const after = (await (await page.request.get(progressUrl)).json()).data
  expect(after).toEqual(confirmed)
  expect((await page.request.get(`/api/v1/books/${book.id}/file`)).status()).toBe(200)
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await logout(page)
})
