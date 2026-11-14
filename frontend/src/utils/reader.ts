import type { ReaderMode } from "@/types/readingProgress"

export function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1)), Math.max(1, pageCount))
}

export function visiblePages(page: number, pageCount: number, mode: ReaderMode): [number] | [number, number] {
  const clamped = clampPage(page, pageCount)
  const start = mode === "double" ? clamped - ((clamped - 1) % 2) : clamped
  return mode === "double" && start < pageCount ? [start, start + 1] : [start]
}

export function clampZoom(scale: number) {
  return Math.max(0.5, Math.min(3, Math.round(scale * 100) / 100))
}
