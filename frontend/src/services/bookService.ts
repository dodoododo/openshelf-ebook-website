import { sampleBook } from "@/services/mocks/books"
import { apiClient } from "@/services/apiClient"
import type { ApiResponse } from "@/types/api"
import type { BookDetail, BookPage, BookUpload, PrivateBook } from "@/types/book"

export async function getBook(bookId: string): Promise<ApiResponse<BookDetail>> {
  if (bookId === sampleBook.id) {
    await new Promise((resolve) => setTimeout(resolve, 120))
    return { success: true, data: sampleBook, timestamp: new Date().toISOString() }
  }
  const { data } = await apiClient.get<ApiResponse<PrivateBook>>(`/api/v1/books/${encodeURIComponent(bookId)}`)
  const book = data.data
  return { ...data, data: {
    id: book.id, title: book.title, author: book.author, description: book.description,
    documentVersion: book.file.id,
    pdfUrl: apiClient.getUri({ url: `/api/v1/books/${encodeURIComponent(book.id)}/file` }),
    license: "Private PDF · account reading progress", source: "private", totalPages: book.file.pageCount,
  } }
}

export async function getMyBooks(page = 0, signal?: AbortSignal): Promise<BookPage> {
  const { data } = await apiClient.get<BookPage>("/api/v1/books/mine", { params: { page, size: 12 }, signal })
  return data
}

export async function uploadBook(book: BookUpload, onProgress?: (percentage: number) => void): Promise<ApiResponse<PrivateBook>> {
  const form = new FormData()
  form.append("file", book.file)
  form.append("title", book.title.trim())
  form.append("author", book.author.trim())
  form.append("description", book.description.trim())
  const { data } = await apiClient.post<ApiResponse<PrivateBook>>("/api/v1/books", form, {
    // Axios/browser supplies the multipart boundary; retain the existing CSRF interceptor.
    headers: { "Content-Type": undefined },
    timeout: 120_000,
    onUploadProgress: ({ loaded, total }) => { if (total) onProgress?.(Math.min(100, Math.round(loaded / total * 100))) },
  })
  return data
}
