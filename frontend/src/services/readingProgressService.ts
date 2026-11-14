import type { ApiResponse } from "@/types/api"
import type { MockProgressResult, ReadingProgress } from "@/types/readingProgress"

const memory = new Map<string, ReadingProgress>()
const keyFor = (userId: string, bookId: string, version: string) =>
  `openshelf:mock-progress:v1:${encodeURIComponent(userId)}:${encodeURIComponent(bookId)}:${encodeURIComponent(version)}`

function validProgress(value: unknown, bookId: string, version: string): value is ReadingProgress {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ReadingProgress>
  return item.bookId === bookId && item.documentVersion === version &&
    typeof item.currentPage === "number" && Number.isSafeInteger(item.currentPage) && item.currentPage >= 1 &&
    typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt))
}

function response(data: MockProgressResult): ApiResponse<MockProgressResult> {
  return { success: true, data, timestamp: new Date().toISOString() }
}

/** Browser-only demonstration, not a privacy or database persistence boundary. No credentials are stored. */
export async function getReadingProgress(userId: string, bookId: string, version: string): Promise<ApiResponse<MockProgressResult>> {
  const key = keyFor(userId, bookId, version)
  if (memory.has(key)) return response({ progress: memory.get(key)!, storage: "memory" })
  try {
    const raw = localStorage.getItem(key)
    let parsed: unknown = null
    try { parsed = raw ? JSON.parse(raw) : null } catch { /* Ignore malformed development state. */ }
    return response({ progress: validProgress(parsed, bookId, version) ? parsed : null, storage: "browser" })
  } catch {
    return response({ progress: memory.get(key) ?? null, storage: "memory" })
  }
}

export async function saveReadingProgress(userId: string, progress: ReadingProgress): Promise<ApiResponse<MockProgressResult>> {
  if (!validProgress(progress, progress.bookId, progress.documentVersion)) throw new Error("Invalid reading position.")
  const key = keyFor(userId, progress.bookId, progress.documentVersion)
  try {
    // Synchronous local write before this promise resolves; rapid navigation/reload cannot drop a queued save.
    localStorage.setItem(key, JSON.stringify(progress))
    memory.delete(key)
    return response({ progress, storage: "browser" })
  } catch {
    memory.set(key, progress)
    return response({ progress, storage: "memory" })
  }
}
