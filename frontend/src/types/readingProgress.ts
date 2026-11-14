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

export interface StoredReadingProgress {
  bookId: string
  bookFileId: string
  fileVersion: number
  currentPage: number
  furthestPage: number
  totalPages: number
  progressPercentage: number
  lastReadAt: string
  createdAt: string
  updatedAt: string
}

export type ReaderInitialProgress = ({ kind: "sample" } & MockProgressResult) |
  { kind: "server"; progress: StoredReadingProgress | null }

export interface ContinueReadingItem {
  book: import("@/types/book").PrivateBook
  progress: StoredReadingProgress
}

export interface ContinueReadingPage {
  success: true
  data: ContinueReadingItem[]
  pagination: import("@/types/book").BookPage["pagination"]
  timestamp: string
}

export interface ProgressSaveSnapshot {
  status: "saved" | "unsaved" | "saving" | "failed"
  hasUnsavedChanges: boolean
  error: string | null
}
