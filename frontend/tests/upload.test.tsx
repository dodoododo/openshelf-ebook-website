import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, expect, it, vi } from "vitest"
import { BookUploadForm } from "@/components/books/BookUploadForm"
import { uploadBook } from "@/services/bookService"
import { validateBookUpload, uploadMaxBytes } from "@/utils/bookValidation"
import type { PrivateBook } from "@/types/book"

vi.mock("@/services/bookService", () => ({ uploadBook: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

function form() {
  const onUploaded = vi.fn()
  render(<QueryClientProvider client={new QueryClient()}><BookUploadForm onUploaded={onUploaded} /></QueryClientProvider>)
  return onUploaded
}

it("validates missing, empty, oversized, and wrong-extension PDFs and required metadata", () => {
  const metadata = { title: "Book", author: "Author", description: "" }
  expect(validateBookUpload({ ...metadata, file: null })).toMatch(/Choose a PDF/)
  expect(validateBookUpload({ ...metadata, file: new File([], "empty.pdf") })).toMatch(/empty/)
  expect(validateBookUpload({ ...metadata, file: new File(["text"], "bad.txt") })).toMatch(/extension/)
  const large = new File(["x"], "large.pdf")
  Object.defineProperty(large, "size", { value: uploadMaxBytes + 1 })
  expect(validateBookUpload({ ...metadata, file: large })).toMatch(/smaller/)
  expect(validateBookUpload({ ...metadata, title: " ", file: new File(["pdf"], "good.pdf") })).toMatch(/title/)
})

it("shows form validation before calling the service", async () => {
  form()
  await userEvent.click(screen.getByRole("button", { name: "Upload private PDF" }))
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a PDF file")
  expect(uploadBook).not.toHaveBeenCalled()
})

it("submits a PDF, retains fields after failure, and can retry successfully", async () => {
  const onUploaded = form()
  const file = new File(["PDF fixture"], "my-book.pdf", { type: "application/pdf" })
  await userEvent.upload(screen.getByLabelText("PDF file"), file)
  await userEvent.type(screen.getByLabelText("Author"), "A Reader")
  vi.mocked(uploadBook).mockRejectedValueOnce(new Error("Storage unavailable"))
  await userEvent.click(screen.getByRole("button", { name: "Upload private PDF" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("Storage unavailable")
  expect(screen.getByLabelText("Title")).toHaveValue("my-book")
  const book: PrivateBook = { id: "book-id", title: "my-book", author: "A Reader", description: "", visibility: "PRIVATE", createdAt: "", updatedAt: "", file: { id: "file-1", version: 1, originalFilename: "my-book.pdf", contentType: "application/pdf", sizeBytes: file.size, sha256: "", pageCount: 5, createdAt: "" } }
  vi.mocked(uploadBook).mockResolvedValueOnce({ success: true, data: book, timestamp: "" })
  await userEvent.click(screen.getByRole("button", { name: "Upload private PDF" }))
  expect(onUploaded).toHaveBeenCalledWith(book)
})
