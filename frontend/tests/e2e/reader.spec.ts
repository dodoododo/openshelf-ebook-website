import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// Presentation fixture only; the unchanged auth.spec.ts exercises live Spring sessions.
async function fixture(page: Page, userId: string | null = "reader-one") {
  await page.route("**/api/v1/books/mine*", (route) => route.fulfill({ json: { success: true, data: [], pagination: { page: 0, size: 12, totalElements: 0, totalPages: 0, isLast: true } } }))
  await page.route("**/api/v1/books/missing", (route) => route.fulfill({ status: 404, json: { success: false, error: { code: "BOOK_NOT_FOUND", message: "Book unavailable", details: [] } } }))
  await page.route("**/api/v1/auth/**", (route) => route.fulfill(userId ? {
    json: { data: { id: userId, displayName: "Sample Reader", email: "sample@example.com", role: "ROLE_USER", createdAt: "2026-11-13T00:00:00Z", updatedAt: "2026-11-13T00:00:00Z" } },
  } : { status: 401, json: { message: "Sign in required" } }))
}

async function ready(page: Page, numbers: number[]) {
  await expect(page.locator(".pdf-page")).toHaveCount(numbers.length)
  for (const number of numbers) await expect(page.locator(`[data-page-number="${number}"]`)).toHaveAttribute("data-rendered", "true")
}

test("real PDF and worker, selection, single/double navigation, zoom, fullscreen and cleanup", async ({ page }, testInfo) => {
  await fixture(page)
  await page.setViewportSize({ width: 1280, height: 1000 })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const worker = page.waitForResponse((response) => /pdf\.worker.*\.mjs/.test(response.url()) && response.ok())
  await page.goto("/read/sample")
  await worker
  await ready(page, [1])
  expect(await page.locator("canvas").first().evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data
    let darkPixels = 0
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! < 150 && pixels[i + 3]! > 0) darkPixels++
    return darkPixels
  })).toBeGreaterThan(1000)
  await expect(page.getByRole("complementary")).toHaveCount(0)
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("1")
  await expect(page.getByLabel("Previous page")).toBeDisabled()
  await expect(page.getByLabel("Reading progress")).toHaveAttribute("value", "20")
  const title = page.locator(".textLayer span").filter({ hasText: /^A Quiet Place to Read$/ })
  const rect = await title.boundingBox()
  expect(rect).not.toBeNull()
  await page.mouse.move(rect!.x + 1, rect!.y + rect!.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect!.x + rect!.width - 1, rect!.y + rect!.height / 2, { steps: 12 })
  await page.mouse.up()
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("Quiet Place")
  await page.evaluate(() => window.getSelection()?.removeAllRanges())
  await page.screenshot({ path: testInfo.outputPath("reader-desktop-single.png"), fullPage: true })
  await page.getByLabel("Next page").click()
  await ready(page, [2])
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("2")
  await page.getByRole("button", { name: "Double page", exact: true }).click()
  await ready(page, [1, 2])
  await expect(page.locator(".reader-page-count")).toHaveText("–2 of 5")
  await page.getByLabel("Next page").click()
  await ready(page, [3, 4])
  await page.screenshot({ path: testInfo.outputPath("reader-desktop-double.png"), fullPage: true })
  await page.getByLabel("Next page").click()
  await ready(page, [5])
  await expect(page.getByLabel("Next page")).toBeDisabled()
  await expect(page.getByLabel("Reading progress")).toHaveAttribute("value", "100")
  await page.getByLabel("Previous page").click()
  await ready(page, [3, 4])
  await page.getByRole("button", { name: "Single page", exact: true }).click()
  await ready(page, [3])
  const before = await page.locator(".pdf-page").evaluate((el) => el.getBoundingClientRect().width)
  await page.getByLabel("Zoom in", { exact: true }).click()
  await ready(page, [3])
  await expect(page.getByLabel("Zoom percentage")).toHaveText("125%")
  expect(await page.locator(".pdf-page").evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(before)
  await page.getByLabel("Zoom out", { exact: true }).click()
  await expect(page.getByLabel("Zoom percentage")).toHaveText("100%")
  await page.getByRole("button", { name: "Fit to width", exact: true }).click()
  await ready(page, [3])
  expect(await page.locator(".reader-viewport").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await page.getByLabel("Enter fullscreen").click()
  await expect(page.getByLabel("Exit fullscreen")).toBeVisible()
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.getByLabel("Exit fullscreen").click()
  await expect(page.getByLabel("Enter fullscreen")).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.getByLabel(i % 2 ? "Previous page" : "Next page").click()
  }
  await ready(page, [3])
  expect(await page.locator(".pdf-page canvas").count()).toBe(1)
  expect(errors).toEqual([])
})

test("page jumper restores across reload and library navigation, isolated per user", async ({ page }) => {
  await fixture(page)
  await page.goto("/read/sample")
  await ready(page, [1])
  await page.getByLabel("Page", { exact: true }).fill("4")
  await page.getByRole("button", { name: "Go", exact: true }).click()
  await ready(page, [4])
  await page.reload()
  await ready(page, [4])
  await expect(page.getByText(/Position saved in this browser only/)).toBeVisible()
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await page.getByRole("link", { name: "Open sample reader" }).click()
  await ready(page, [4])
  await page.getByLabel("Page", { exact: true }).fill("99")
  await page.getByRole("button", { name: "Go", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Choose a page from 1 to 5")
  await fixture(page, "reader-two")
  await page.reload()
  await ready(page, [1])
})

test("mobile fits the page, keeps controls visible, supports selection, keyboard and dark theme", async ({ page }, testInfo) => {
  await fixture(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/read/sample")
  await ready(page, [1])
  await expect(page.getByRole("button", { name: "Double page", exact: true })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator(".reader-viewport").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  for (const name of ["Next page", "Zoom in", "Zoom out"]) {
    const box = await page.getByLabel(name, { exact: true }).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations
  expect(violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath("reader-mobile-dark.png"), fullPage: true })
  await page.getByLabel("PDF reading area").focus()
  await page.keyboard.press("ArrowRight")
  await ready(page, [2])
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.getByRole("button", { name: "Double page", exact: true }).click()
  await ready(page, [1, 2])
  await page.setViewportSize({ width: 375, height: 812 })
  await ready(page, [1])
})

test("PDF loading and errors support retry; unknown books and guest reader access are handled", async ({ page }) => {
  await fixture(page)
  let fail = true
  await page.route("**/sample.pdf", async (route) => {
    if (fail) return route.fulfill({ status: 404, body: "Missing PDF" })
    await route.continue()
  })
  await page.goto("/read/sample")
  await expect(page.getByRole("alert")).toContainText("couldn’t open this PDF")
  fail = false
  await page.getByRole("button", { name: "Retry PDF" }).click()
  await ready(page, [1])
  await page.goto("/read/missing")
  await expect(page.getByRole("heading", { name: "Book unavailable" })).toBeVisible()
  await fixture(page, null)
  await page.goto("/read/sample")
  await expect(page).toHaveURL(/\/login$/)
})

test("denied browser storage falls back visibly", async ({ page }) => {
  await fixture(page)
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Denied", "SecurityError") }
    Storage.prototype.setItem = () => { throw new DOMException("Denied", "SecurityError") }
  })
  await page.goto("/read/sample")
  await ready(page, [1])
  await expect(page.getByText(/position kept in memory/)).toBeVisible()
  await page.getByLabel("Next page").click()
  await ready(page, [2])
})

test("loading remains visible until PDF bytes arrive and old positions clamp to the last page", async ({ page }) => {
  await fixture(page)
  await page.addInitScript(() => {
    localStorage.setItem("openshelf:mock-progress:v1:reader-one:sample:quiet-place-v1", JSON.stringify({
      bookId: "sample", documentVersion: "quiet-place-v1", currentPage: 999, updatedAt: "2026-11-13T00:00:00Z",
    }))
  })
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/sample.pdf", async (route) => { await gate; await route.continue() })
  await page.goto("/read/sample")
  try { await expect(page.getByRole("status").filter({ hasText: /Loading PDF/ })).toBeVisible() }
  finally { release() }
  await ready(page, [5])
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("5")
  await page.getByRole("button", { name: "Double page", exact: true }).click()
  await ready(page, [5])
})
