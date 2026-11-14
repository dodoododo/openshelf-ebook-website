import { expect, it, vi } from "vitest"
import { apiClient } from "@/services/apiClient"
import { getBook, uploadBook } from "@/services/bookService"
import type { PrivateBook } from "@/types/book"

const book: PrivateBook = { id: "book-1", title: "Private book", author: "Author", description: "", visibility: "PRIVATE", createdAt: "", updatedAt: "", file: { id: "immutable-file-version", version: 1, originalFilename: "book.pdf", contentType: "application/pdf", sizeBytes: 7, sha256: "", pageCount: 5, createdAt: "" } }

it("maps private metadata into the existing reader and scopes progress by immutable file ID", async () => {
  vi.spyOn(apiClient, "get").mockResolvedValue({ data: { success: true, data: book, timestamp: "" } })
  const { data } = await getBook(book.id)
  expect(data.documentVersion).toBe("immutable-file-version")
  expect(data.source).toBe("private")
  expect(data.pdfUrl).toBe("/api/v1/books/book-1/file")
})

it("sends FormData without forcing a boundary or trusting a client owner", async () => {
  const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true, data: book, timestamp: "" } })
  await uploadBook({ title: " Book ", author: " Author ", description: "", file: new File(["PDF"], "book.pdf") })
  const form = post.mock.calls[0]![1] as FormData
  expect(form.get("title")).toBe("Book")
  expect(form.has("ownerId")).toBe(false)
  expect(form.has("visibility")).toBe(false)
  expect(form.get("file")).toBeInstanceOf(File)
  expect(post.mock.calls[0]![2]?.headers).toEqual({ "Content-Type": undefined })
})
