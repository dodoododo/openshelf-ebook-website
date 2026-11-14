import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createReadingProgressQueue } from "@/utils/readingProgressQueue"

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

it("does not save a restored page and coalesces rapid changes after 1.5 seconds", async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 2, confirmedPage: 2, save })
  queue.start()
  await vi.advanceTimersByTimeAsync(3000)
  expect(save).not.toHaveBeenCalled()
  queue.setPage(3); queue.setPage(4); queue.setPage(5)
  expect(queue.getSnapshot().status).toBe("unsaved")
  await vi.advanceTimersByTimeAsync(1499)
  expect(save).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(save.mock.calls).toEqual([[5]])
  expect(queue.getSnapshot().status).toBe("saved")
})

it("creates initial page 1 only after the PDF is ready and confirmed persistence resolves", async () => {
  const pending = deferred()
  const save = vi.fn().mockReturnValue(pending.promise)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: null, save })
  await vi.advanceTimersByTimeAsync(3000)
  expect(save).not.toHaveBeenCalled()
  queue.start()
  await vi.advanceTimersByTimeAsync(1500)
  expect(queue.getSnapshot().status).toBe("saving")
  expect(queue.getSnapshot().hasUnsavedChanges).toBe(true)
  pending.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(queue.getSnapshot().status).toBe("saved")
})

it("serializes an in-flight save and retains the newest queued position", async () => {
  const first = deferred(), second = deferred()
  const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(2)
  await vi.advanceTimersByTimeAsync(1500)
  queue.setPage(3); queue.setPage(4)
  await vi.advanceTimersByTimeAsync(2000)
  expect(save.mock.calls).toEqual([[2]])
  first.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(save.mock.calls).toEqual([[2], [4]])
  expect(queue.getSnapshot().status).toBe("saving")
  second.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(queue.getSnapshot().status).toBe("saved")
})

it("returns to an earlier confirmed position safely while a different save is in flight", async () => {
  const pending = deferred()
  const save = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(2)
  await vi.advanceTimersByTimeAsync(1500)
  queue.setPage(1)
  expect(queue.getSnapshot().status).toBe("saving")
  pending.resolve()
  await vi.advanceTimersByTimeAsync(1500)
  expect(save.mock.calls).toEqual([[2], [1]])
  expect(queue.getSnapshot().status).toBe("saved")
})

it("does not send duplicate or reverted pending values", async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(2); queue.setPage(2); queue.setPage(1)
  await vi.advanceTimersByTimeAsync(3000)
  expect(save).not.toHaveBeenCalled()
  expect(queue.getSnapshot().status).toBe("saved")
})

it("keeps failures visible without automatic retries and retries the latest value manually", async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(4)
  await vi.advanceTimersByTimeAsync(1500)
  expect(queue.getSnapshot()).toEqual({ status: "failed", hasUnsavedChanges: true, error: "Offline" })
  await vi.advanceTimersByTimeAsync(30000)
  expect(save).toHaveBeenCalledTimes(1)
  expect(await queue.flush()).toBe(true)
  expect(save.mock.calls).toEqual([[4], [4]])
  expect(queue.getSnapshot().status).toBe("saved")
})

it("flushes the latest position on leaving, including a pending in-flight request", async () => {
  const pending = deferred()
  const save = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(2)
  await vi.advanceTimersByTimeAsync(1500)
  queue.setPage(4)
  const leaving = queue.flush()
  pending.resolve()
  expect(await leaving).toBe(true)
  expect(save.mock.calls).toEqual([[2], [4]])
})

it("does not transmit an explicitly abandoned unsaved position", async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  const queue = createReadingProgressQueue({ initialPage: 1, confirmedPage: 1, save })
  queue.start(); queue.setPage(4); queue.abandon()
  expect(await queue.flush()).toBe(false)
  await vi.advanceTimersByTimeAsync(3000)
  expect(save).not.toHaveBeenCalled()
})
