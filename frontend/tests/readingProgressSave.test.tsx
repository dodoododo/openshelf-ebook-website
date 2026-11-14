import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, expect, it, vi, type Mock } from "vitest"
import type { ReactNode } from "react"
import { useReadingProgressSave } from "@/hooks/useReadingProgressSave"
import { currentUserKey } from "@/hooks/useCurrentUser"
import { updatePrivateReadingProgress } from "@/services/readingProgressService"

vi.mock("@/services/readingProgressService", () => ({ updatePrivateReadingProgress: vi.fn() }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

function setup() {
  const client = new QueryClient()
  client.setQueryData(currentUserKey, { id: "reader-a" })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useReadingProgressSave({ userId: "reader-a", bookId: "book-a", fileId: "file-a", initialPage: 1, confirmedPage: 1, enabled: true, privateBook: true }), { wrapper })
  return { ...hook, client, invalidate }
}

it("does not send an old reader's queued save after account switching", async () => {
  vi.useFakeTimers()
  const { result, client } = setup()
  act(() => result.current.setPage(4))
  client.setQueryData(currentUserKey, { id: "reader-b" })
  await act(() => vi.advanceTimersByTimeAsync(1500))
  expect(updatePrivateReadingProgress).not.toHaveBeenCalled()
  expect(result.current.status).toBe("failed")
})

it("does not invalidate or recreate private caches from a late response after logout", async () => {
  vi.useFakeTimers()
  let resolve!: () => void
  ;(updatePrivateReadingProgress as Mock).mockReturnValue(new Promise<void>((yes) => { resolve = yes }))
  const { result, client, invalidate } = setup()
  act(() => result.current.setPage(4))
  await act(() => vi.advanceTimersByTimeAsync(1500))
  client.setQueryData(currentUserKey, null)
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" })
  await act(async () => { resolve(); await vi.advanceTimersByTimeAsync(0) })
  expect(invalidate).not.toHaveBeenCalled()
  expect(client.getQueryCache().findAll({ queryKey: ["continue-reading", "reader-a"] })).toHaveLength(0)
})
