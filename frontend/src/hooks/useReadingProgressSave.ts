import { useEffect, useState, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { currentUserKey } from "@/hooks/useCurrentUser"
import { updatePrivateReadingProgress } from "@/services/readingProgressService"
import { createReadingProgressQueue } from "@/utils/readingProgressQueue"
import type { User } from "@/types/auth"

export function useReadingProgressSave({ userId, bookId, fileId, initialPage, confirmedPage, enabled, privateBook }: {
  userId: string; bookId: string; fileId: string; initialPage: number; confirmedPage: number | null; enabled: boolean; privateBook: boolean
}) {
  const client = useQueryClient()
  const [queue] = useState(() => createReadingProgressQueue({ initialPage, confirmedPage, save: async (page) => {
    // A departing reader's queued work must not send or repopulate caches for a new account.
    if (client.getQueryData<User | null>(currentUserKey)?.id !== userId) throw new Error("Your session changed. Reopen the book to continue.")
    await updatePrivateReadingProgress(bookId, fileId, page)
    if (client.getQueryData<User | null>(currentUserKey)?.id === userId) {
      void client.invalidateQueries({ queryKey: ["continue-reading", userId] })
    }
  } }))
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot)

  useEffect(() => { if (privateBook && enabled) queue.start() }, [queue, enabled, privateBook])
  useEffect(() => {
    if (!privateBook) return
    const unload = (event: BeforeUnloadEvent) => {
      if (!queue.getSnapshot().hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ""
      void queue.flush()
    }
    const hide = () => { if (document.visibilityState === "hidden") void queue.flush() }
    window.addEventListener("beforeunload", unload)
    document.addEventListener("visibilitychange", hide)
    return () => {
      window.removeEventListener("beforeunload", unload)
      document.removeEventListener("visibilitychange", hide)
      // Keep the serial request chain alive after normal route unmount; delivery on tab close is best effort.
      void queue.flush()
    }
  }, [queue, privateBook])

  return { ...snapshot, setPage: queue.setPage, flush: queue.flush, abandon: queue.abandon }
}
