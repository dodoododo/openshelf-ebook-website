import type { BookUpload } from "@/types/book"

// Advisory browser check; the server's configurable limits and PDF parsing are authoritative.
export const uploadMaxBytes = Number(import.meta.env.VITE_UPLOAD_MAX_BYTES || 30 * 1024 * 1024)

export function validateBookUpload(book: Omit<BookUpload, "file"> & { file: File | null }): string | null {
  if (!book.file) return "Choose a PDF file."
  if (!/\.pdf$/i.test(book.file.name)) return "Choose a file with a .pdf extension."
  if (book.file.size === 0) return "The selected file is empty."
  if (book.file.size > uploadMaxBytes) return `Choose a PDF smaller than ${Math.round(uploadMaxBytes / 1024 / 1024)} MB.`
  if (!book.title.trim() || book.title.trim().length > 200) return "Enter a title of 1–200 characters."
  if (!book.author.trim() || book.author.trim().length > 200) return "Enter an author of 1–200 characters."
  if (book.description.trim().length > 4000) return "Use at most 4,000 characters for the description."
  return null
}
