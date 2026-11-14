import { test, expect, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const bookId = "11111111-1111-4111-8111-111111111111"
const fileId = "22222222-2222-4222-8222-222222222222"
const stamp = "2026-11-14T00:00:00Z"
const metadata = { id: bookId, title: "A saved chapter", author: "OpenShelf", description: "", visibility: "PRIVATE", createdAt: stamp, updatedAt: stamp,
  file: { id: fileId, version: 1, originalFilename: "sample.pdf", contentType: "application/pdf", sizeBytes: 7109, sha256: "", pageCount: 5, createdAt: stamp } }
const stored = (page: number) => ({ bookId, bookFileId: fileId, fileVersion: 1, currentPage: page, furthestPage: page, totalPages: 5, progressPercentage: page * 20, lastReadAt: stamp, createdAt: stamp, updatedAt: stamp })

async function fixture(page: Page, savedPage = 4) {
  let current = savedPage
  await page.route("**/api/v1/auth/**", (route) => route.fulfill({ json: { success: true, data: { id: "progress-reader", displayName: "Reader", email: "reader@example.com", role: "ROLE_USER", headerName: "X-CSRF-TOKEN", token: "presentation-only" } } }))
  await page.route("**/api/v1/library/continue-reading*", (route) => route.fulfill({ json: { success: true, data: [], pagination: { page: 0, size: 6, totalElements: 0, totalPages: 0, isLast: true } } }))
  await page.route("**/api/v1/books/mine*", (route) => route.fulfill({ json: { success: true, data: [], pagination: { page: 0, size: 12, totalElements: 0, totalPages: 0, isLast: true } } }))
  await page.route(`**/api/v1/books/${bookId}`, (route) => route.fulfill({ json: { success: true, data: metadata } }))
  const bytes = await readFile(resolve("public/sample.pdf"))
  await page.route(`**/api/v1/books/${bookId}/file`, (route) => route.fulfill({ body: bytes, contentType: "application/pdf" }))
  const writes: number[] = []
  await page.route(`**/api/v1/books/${bookId}/progress*`, async (route) => {
    if (route.request().method() === "PUT") { current = route.request().postDataJSON().currentPage; writes.push(current) }
    await route.fulfill({ json: { success: true, data: current ? stored(current) : null } })
  })
  return writes
}
async function ready(page: Page, number: number) { await expect(page.locator(`[data-page-number="${number}"]`)).toHaveAttribute("data-rendered", "true") }

test("restores before saving, avoids zoom/mode/resize writes, and coalesces rapid page changes", async ({ page }, testInfo) => {
  const writes = await fixture(page)
  await page.goto(`/read/${bookId}`)
  await ready(page, 4)
  await expect(page.getByLabel("Reading save status")).toContainText("Saved")
  await page.getByLabel("Zoom in", { exact: true }).click()
  await page.getByRole("button", { name: "Double page", exact: true }).click()
  await ready(page, 3); await ready(page, 4)
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("4")
  await page.getByRole("button", { name: "Single page", exact: true }).click()
  await ready(page, 4)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(1800) // Longer than the debounce: presentation changes must not persist positions.
  expect(writes).toEqual([])
  await page.getByLabel("Previous page").click()
  await page.getByLabel("Next page").click()
  await page.getByLabel("Next page").click()
  await ready(page, 5)
  await expect(page.getByLabel("Reading save status")).toContainText("Saved")
  expect(writes).toEqual([5])
  await page.screenshot({ path: testInfo.outputPath("progress-reader-mobile.png"), fullPage: true })
  await page.reload()
  await ready(page, 5)
})

test("shows saving/failure, preserves newer pages during a slow request, and retries without reverting", async ({ page }) => {
  await fixture(page, 1)
  const writes: number[] = []
  let fail = true
  let release!: () => void
  const gate = new Promise<void>((yes) => { release = yes })
  await page.route(`**/api/v1/books/${bookId}/progress*`, async (route) => {
    if (route.request().method() !== "PUT") return route.fulfill({ json: { success: true, data: stored(1) } })
    const target = route.request().postDataJSON().currentPage
    writes.push(target)
    if (writes.length === 1) await gate
    if (fail) return route.fulfill({ status: 503, json: { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Progress service unavailable", details: [] } } })
    await route.fulfill({ json: { success: true, data: stored(target) } })
  })
  await page.goto(`/read/${bookId}`)
  await ready(page, 1)
  await page.getByLabel("Page", { exact: true }).fill("4")
  await page.getByRole("button", { name: "Go", exact: true }).click()
  await expect(page.getByLabel("Reading save status")).toHaveText("Unsaved changes")
  await expect(page.getByLabel("Reading save status")).toHaveText("Saving…")
  await page.getByLabel("Next page").click()
  await ready(page, 5)
  release()
  await expect(page.getByLabel("Reading save status")).toHaveText("Save failed")
  expect(writes).toEqual([4])
  fail = false
  await page.getByRole("button", { name: "Retry save" }).click()
  await expect(page.getByLabel("Reading save status")).toContainText("Saved")
  expect(writes).toEqual([4, 5])
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("5")
  fail = true
  await page.getByLabel("Previous page").click()
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await expect(page.getByText(/Your latest position is not saved/)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/read/${bookId}$`))
  fail = false
  await page.getByRole("button", { name: "Retry save" }).click()
  await expect(page.getByLabel("Reading save status")).toContainText("Saved")
  await page.getByRole("link", { name: "My Library", exact: true }).click()
  await expect(page).toHaveURL(/\/library$/)
})

test("a progress load failure cannot silently restore local state or overwrite page 1", async ({ page }) => {
  const writes = await fixture(page)
  await page.route(`**/api/v1/books/${bookId}/progress*`, (route) => route.fulfill({ status: 503, json: { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Saved position unavailable", details: [] } } }))
  await page.goto(`/read/${bookId}`)
  await expect(page.getByRole("heading", { name: "Book unavailable" })).toBeVisible()
  await expect(page.locator(".pdf-page")).toHaveCount(0)
  expect(writes).toEqual([])
})

test("an expired progress session removes private reader content", async ({ page }) => {
  await fixture(page, 1)
  await page.route(`**/api/v1/books/${bookId}/progress*`, async (route) => route.request().method() === "PUT"
    ? route.fulfill({ status: 401, json: { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in", details: [] } } })
    : route.fulfill({ json: { success: true, data: stored(1) } }))
  await page.goto(`/read/${bookId}`)
  await ready(page, 1)
  await page.getByLabel("Next page").click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator(".pdf-page")).toHaveCount(0)
})

test("Continue Reading has loading, error/retry, pagination and resume actions", async ({ page }, testInfo) => {
  await fixture(page)
  let fail = true
  await page.route("**/api/v1/library/continue-reading*", (route) => {
    if (fail) return route.fulfill({ status: 503, json: { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Recent reading unavailable", details: [] } } })
    const index = Number(new URL(route.request().url()).searchParams.get("page"))
    return route.fulfill({ json: { success: true, data: [{ book: { ...metadata, title: index === 0 ? "A saved chapter" : "An older chapter" }, progress: stored(4) }], pagination: { page: index, size: 6, totalElements: 7, totalPages: 2, isLast: index === 1 } } })
  })
  await page.goto("/library/continue-reading")
  await expect(page.getByRole("alert")).toContainText("Recent reading unavailable")
  fail = false
  await page.getByRole("button", { name: "Retry reading progress" }).click()
  await expect(page.getByText("Page 4 of 5 · 80%")).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("continue-reading-desktop.png"), fullPage: true })
  await page.getByRole("navigation", { name: "Continue Reading pages" }).getByRole("button", { name: "Next" }).click()
  await expect(page.getByRole("link", { name: "Resume An older chapter" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Continue Reading pages" }).getByRole("button", { name: "Next" })).toBeDisabled()
  await page.getByRole("link", { name: "Resume An older chapter" }).click()
  await ready(page, 4)
})
