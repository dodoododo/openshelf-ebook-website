import { beforeEach, describe, expect, it, vi } from "vitest"
import { clampPage, visiblePages } from "@/utils/reader"
import { getBook } from "@/services/bookService"
import { apiClient } from "@/services/apiClient"
import { getReadingProgress, saveReadingProgress } from "@/services/readingProgressService"
import type { ReadingProgress } from "@/types/readingProgress"

const progress: ReadingProgress = { bookId: "sample", documentVersion: "v1", currentPage: 3, updatedAt: "2026-11-13T00:00:00Z" }

describe("reader position boundaries", () => {
  it("handles the first, final unpaired, and even-page spreads", () => {
    expect(visiblePages(1, 5, "double")).toEqual([1, 2])
    expect(visiblePages(4, 5, "double")).toEqual([3, 4])
    expect(visiblePages(5, 5, "double")).toEqual([5])
    expect(visiblePages(4, 4, "double")).toEqual([3, 4])
    expect(visiblePages(2, 5, "single")).toEqual([2])
  })

  it("clamps obsolete restored pages, invalid numbers, and navigation boundaries", () => {
    expect(clampPage(500, 5)).toBe(5)
    expect(clampPage(-1, 5)).toBe(1)
    expect(clampPage(NaN, 5)).toBe(1)
    expect(visiblePages(999, 5, "double")).toEqual([5])
  })
})

describe("browser-only reading progress service", () => {
  beforeEach(() => { localStorage.clear() })

  it("restores progress and isolates users, books, and document versions", async () => {
    await saveReadingProgress("reader-a", progress)
    expect((await getReadingProgress("reader-a", "sample", "v1")).data.progress).toEqual(progress)
    expect((await getReadingProgress("reader-b", "sample", "v1")).data.progress).toBeNull()
    expect((await getReadingProgress("reader-a", "other", "v1")).data.progress).toBeNull()
    expect((await getReadingProgress("reader-a", "sample", "v2")).data.progress).toBeNull()
  })

  it.each(["{", JSON.stringify({ ...progress, currentPage: -3 }), JSON.stringify({ ...progress, currentPage: 1.5 }), JSON.stringify({ ...progress, documentVersion: "v2" }), JSON.stringify({ ...progress, updatedAt: "invalid" })])("ignores corrupt or mismatched stored state: %s", async (raw) => {
    localStorage.setItem("openshelf:mock-progress:v1:corrupt:sample:v1", raw)
    expect((await getReadingProgress("corrupt", "sample", "v1")).data.progress).toBeNull()
  })

  it("reports memory-only operation when storage is denied", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError") })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError") })
    expect((await saveReadingProgress("no-storage", progress)).data.storage).toBe("memory")
    expect((await getReadingProgress("no-storage", "sample", "v1")).data).toEqual({ progress, storage: "memory" })
  })

  it("rejects invalid writes", async () => {
    await expect(saveReadingProgress("reader", { ...progress, currentPage: NaN })).rejects.toThrow("Invalid reading position")
  })

  it("retains the memory fallback when quota blocks writing but permits reading", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError") })
    await saveReadingProgress("quota-reader", progress)
    expect((await getReadingProgress("quota-reader", "sample", "v1")).data).toEqual({ progress, storage: "memory" })
  })
})

it("keeps the bundled sample while forwarding other books to the real service", async () => {
  expect((await getBook("sample")).data.pdfUrl).toBe("/sample.pdf")
  const get = vi.spyOn(apiClient, "get").mockRejectedValue(new Error("Book unavailable"))
  await expect(getBook("unknown")).rejects.toThrow("Book unavailable")
  expect(get).toHaveBeenCalledWith("/api/v1/books/unknown")
})
