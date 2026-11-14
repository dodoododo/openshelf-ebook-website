import { Columns2, File, Minus, Plus, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReaderMode } from "@/types/readingProgress"

export function ReaderToolbar({ mode, setMode, narrow, zoom, scale, setZoom }: {
  mode: ReaderMode
  setMode: (mode: ReaderMode) => void
  narrow: boolean
  zoom: number | "fit"
  scale: number
  setZoom: (zoom: number | "fit") => void
}) {
  return <div className="reader-toolbar" aria-label="Reader controls">
    <div className="reader-control-group" role="group" aria-label="Page layout">
      <Button size="sm" variant={mode === "single" ? "secondary" : "ghost"} aria-pressed={mode === "single"} onClick={() => setMode("single")}><File aria-hidden="true" />Single page</Button>
      <Button size="sm" variant={mode === "double" ? "secondary" : "ghost"} aria-pressed={mode === "double"} disabled={narrow} onClick={() => setMode("double")} title={narrow ? "Double-page view is available on wider screens" : undefined}><Columns2 aria-hidden="true" />Double page</Button>
    </div>
    <div className="reader-control-group" role="group" aria-label="Zoom controls">
      <Button size="icon" variant="ghost" aria-label="Zoom out" disabled={scale <= 0.5} onClick={() => setZoom(Math.max(0.5, scale - 0.25))}><Minus aria-hidden="true" /></Button>
      <output className="reader-zoom" aria-label="Zoom percentage">{Math.round(scale * 100)}%</output>
      <Button size="icon" variant="ghost" aria-label="Zoom in" disabled={scale >= 3} onClick={() => setZoom(Math.min(3, Math.max(0.5, scale + 0.25)))}><Plus aria-hidden="true" /></Button>
      <Button size="sm" variant={zoom === "fit" ? "secondary" : "ghost"} aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}><ScanLine aria-hidden="true" />Fit to width</Button>
    </div>
  </div>
}
