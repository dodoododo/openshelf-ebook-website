import type { BookDetail } from "@/types/book"

export const sampleBook: BookDetail = {
  id: "sample",
  title: "A Quiet Place to Read",
  author: "OpenShelf",
  description: "Five short reflections on making room for a good book. An original, freely redistributable reader sample.",
  documentVersion: "quiet-place-v1",
  pdfUrl: `${import.meta.env.BASE_URL}sample.pdf`,
  license: "CC0 1.0 · original development sample",
}
