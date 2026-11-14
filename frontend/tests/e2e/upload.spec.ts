import { test, expect, type Page } from "@playwright/test"
import { readFile, writeFile, unlink } from "node:fs/promises"
import { resolve } from "node:path"

const password = "A long upload browser test passphrase"

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register")
  await page.getByLabel("Display name").fill("Private Reader")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Account created")
  await login(page, email)
}
async function login(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test("real upload → library → reader → reload → logout → second-user isolation", async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  await expect.poll(async () => {
    try { return (await page.request.get("/api/v1/auth/csrf")).status() } catch { return 0 }
  }, { timeout: 30_000 }).toBe(200)
  const first = `upload-first-${Date.now()}@example.com`
  const second = `upload-second-${Date.now()}@example.com`
  await registerAndLogin(page, first)
  await page.goto("/library")
  await expect(page.getByRole("heading", { name: "A shelf of your own." })).toBeVisible()
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click()
  await page.getByRole("button", { name: "Upload private PDF" }).click()
  await expect(page.getByRole("alert")).toContainText("Choose a PDF file")
  await page.getByLabel("PDF file", { exact: true }).setInputFiles(resolve("public/sample.pdf"))
  await page.getByLabel("Title", { exact: true }).fill("My private reading")
  await page.getByLabel("Author", { exact: true }).fill("Private Author")
  const uploaded = page.waitForResponse((response) => response.url().endsWith("/api/v1/books") && response.request().method() === "POST")
  await page.getByRole("button", { name: "Upload private PDF" }).click()
  const response = await uploaded
  expect(response.status()).toBe(201)
  const { data: book } = await response.json()
  expect(book.visibility).toBe("PRIVATE")
  expect(book.file.pageCount).toBe(5)
  expect(JSON.stringify(book)).not.toMatch(/storageKey|storage_key/)
  await expect(page.getByRole("link", { name: "Read My private reading" })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("link", { name: "Read My private reading" })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("private-library.png"), fullPage: true })
  await page.getByRole("link", { name: "Read My private reading" }).click()
  await expect(page.locator('[data-page-number="1"]')).toHaveAttribute("data-rendered", "true")
  await expect(page.getByText("Private PDF", { exact: true })).toBeVisible()
  await page.getByLabel("Next page").click()
  await page.reload()
  await expect(page.locator('[data-page-number="2"]')).toHaveAttribute("data-rendered", "true")
  await page.screenshot({ path: testInfo.outputPath("private-reader.png"), fullPage: true })
  const fileUrl = `/api/v1/books/${book.id}/file`
  const range = await page.request.get(fileUrl, { headers: { Range: "bytes=0-15" } })
  expect(range.status()).toBe(206)
  expect(await range.body()).toEqual((await readFile(resolve("public/sample.pdf"))).subarray(0, 16))
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await logout(page)
  expect((await page.request.get(fileUrl)).status()).toBe(401)
  await registerAndLogin(page, second)
  await page.goto("/library")
  await expect(page.getByRole("heading", { name: "A shelf of your own." })).toBeVisible()
  expect((await page.request.get(`/api/v1/books/${book.id}`)).status()).toBe(404)
  expect((await page.request.get(fileUrl, { headers: { Range: "bytes=0-15" } })).status()).toBe(404)
  await page.goto(`/read/${book.id}`)
  await expect(page.getByRole("heading", { name: "Book unavailable" })).toBeVisible()

  // Optional real process restart, enabled for a dedicated serial verification run.
  if (process.env.OPENSHELF_VERIFY_RESTART === "1") {
    const control = resolve("../backend/target/browser-control")
    await unlink(resolve(control, "restart.ready")).catch(() => {})
    await writeFile(resolve(control, "restart.request"), "restart")
    await expect.poll(async () => { try { return await readFile(resolve(control, "restart.ready"), "utf8") } catch { return "waiting" } }, { timeout: 120_000 }).toBe("ready")
    await page.goto("/account")
    await expect(page).toHaveURL(/\/login$/)
    await login(page, first)
    await page.goto("/library")
    await expect(page.getByRole("link", { name: "Read My private reading" })).toBeVisible()
    await page.getByRole("link", { name: "Read My private reading" }).click()
    await expect(page.locator('[data-page-number="2"]')).toHaveAttribute("data-rendered", "true")
    expect((await page.request.get(fileUrl)).status()).toBe(200)
    expect((await (await page.request.get(`/api/v1/books/${book.id}`)).json()).data.file.id).toBe(book.file.id)
    await page.getByRole("link", { name: "My Library", exact: true }).click()
    await logout(page)
    expect((await page.request.get(fileUrl)).status()).toBe(401)
  }
})

test("mobile upload handles server errors without losing form input", async ({ page }, testInfo) => {
  await page.route("**/api/v1/auth/**", (route) => route.fulfill({ json: { data: { id: "upload-test", email: "test@example.com", displayName: "Reader", role: "ROLE_USER", headerName: "X-CSRF-TOKEN", token: "test-only" } } }))
  await page.route("**/api/v1/books/mine*", (route) => route.fulfill({ json: { success: true, data: [], pagination: { page: 0, size: 12, totalPages: 0, totalElements: 0, isLast: true } } }))
  await page.route("**/api/v1/books", (route) => route.fulfill({ status: 400, json: { success: false, error: { code: "INVALID_PDF", message: "Choose a valid, unencrypted PDF", details: [] } } }))
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/library")
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click()
  await page.getByLabel("PDF file", { exact: true }).setInputFiles(resolve("public/sample.pdf"))
  await page.getByLabel("Author", { exact: true }).fill("Author")
  await page.getByRole("button", { name: "Upload private PDF" }).click()
  await expect(page.getByRole("alert")).toContainText("valid, unencrypted PDF")
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("sample")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("private-upload-mobile.png"), fullPage: true })
})
