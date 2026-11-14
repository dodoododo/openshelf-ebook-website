import type { ProgressSaveSnapshot } from "@/types/readingProgress"

/** One reader session's debounced, serial save queue. Never replaces the displayed page with a response. */
export function createReadingProgressQueue({ initialPage, confirmedPage, save, debounceMs = 1500 }: {
  initialPage: number
  confirmedPage: number | null
  save: (page: number) => Promise<unknown>
  debounceMs?: number
}) {
  let desired = initialPage
  let confirmed = confirmedPage
  let enabled = false
  let error: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let inFlight: Promise<boolean> | undefined
  let due = 0
  const listeners = new Set<() => void>()
  let snapshot: ProgressSaveSnapshot = { status: confirmed === null ? "unsaved" : "saved", hasUnsavedChanges: false, error: null }

  function emit() {
    const dirty = desired !== confirmed || !!inFlight
    snapshot = { status: error ? "failed" : inFlight ? "saving" : dirty ? "unsaved" : "saved", hasUnsavedChanges: enabled && dirty, error }
    listeners.forEach((listener) => listener())
  }
  function cancelTimer() { clearTimeout(timer); timer = undefined }
  function schedule() {
    cancelTimer()
    if (enabled && !error && desired !== confirmed) timer = setTimeout(() => { void run(false) }, Math.max(0, due - Date.now()))
  }
  function run(force: boolean): Promise<boolean> {
    cancelTimer()
    if (!enabled) return Promise.resolve(desired === confirmed)
    if (inFlight) return inFlight.then((success) => success && force ? run(true) : success)
    if (error && !force) return Promise.resolve(false)
    if (desired === confirmed) { error = null; emit(); return Promise.resolve(true) }
    const target = desired
    error = null
    inFlight = Promise.resolve().then(() => save(target)).then(() => {
      confirmed = target
      return true
    }).catch((failure: unknown) => {
      error = failure instanceof Error ? failure.message : "The position could not be saved. Please retry."
      return false
    }).finally(() => {
      inFlight = undefined
      emit()
      schedule()
    })
    emit()
    return inFlight.then((success) => success && force && desired !== confirmed ? run(true) : success)
  }

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => snapshot,
    start() { enabled = true; due = Date.now() + debounceMs; emit(); schedule() },
    setPage(page: number) {
      if (page === desired) return
      desired = page
      error = null
      due = Date.now() + debounceMs
      emit()
      schedule()
    },
    flush: () => run(true),
    abandon() { enabled = false; cancelTimer() },
  }
}
