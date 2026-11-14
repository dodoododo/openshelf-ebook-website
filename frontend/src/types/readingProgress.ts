export interface ReadingProgress {
  bookId: string
  documentVersion: string
  currentPage: number
  updatedAt: string
}

export interface MockProgressResult {
  progress: ReadingProgress | null
  storage: "browser" | "memory"
}

export type ReaderMode = "single" | "double"
