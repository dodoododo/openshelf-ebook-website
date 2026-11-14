import { useEffect, useRef, useState } from "react"
import type { PDFPageProxy, RenderTask } from "pdfjs-dist"
import { TextLayer } from "@/lib/pdf"

export function PdfPage({ page, scale }: { page: PDFPageProxy; scale: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const viewport = page.getViewport({ scale })

  useEffect(() => {
    const host = hostRef.current!
    let active = true
    let task: RenderTask | undefined
    let text: TextLayer | undefined
    // Each render owns a fresh canvas, so cancelled renders never race for the same canvas.
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    const layer = document.createElement("div")
    layer.className = "textLayer"
    const viewport = page.getViewport({ scale })
    layer.style.setProperty("--total-scale-factor", String(viewport.scale))
    layer.style.setProperty("--scale-round-x", "1px")
    layer.style.setProperty("--scale-round-y", "1px")
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Also cap backing pixels for large pages at high zoom (about 32 MB per canvas).
    const outputScale = Math.min(dpr, Math.sqrt(8_000_000 / (viewport.width * viewport.height)))
    canvas.width = Math.ceil(viewport.width * outputScale)
    canvas.height = Math.ceil(viewport.height * outputScale)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    host.replaceChildren(canvas, layer)

    async function render() {
      try {
        task = page.render({ canvas, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] })
        await task.promise
        if (!active) return
        text = new TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport })
        await text.render()
        if (active) setStatus("ready")
      } catch {
        if (active) setStatus("error")
      } finally {
        if (!active) { canvas.width = 0; canvas.height = 0 }
      }
    }
    void render()
    return () => {
      active = false
      task?.cancel()
      text?.cancel()
      host.replaceChildren()
      // Release backing pixels after rendering has stopped, including rapid zoom/page changes.
      if (task) void task.promise.catch(() => {}).finally(() => { canvas.width = 0; canvas.height = 0 })
      else { canvas.width = 0; canvas.height = 0 }
    }
  }, [page, scale, attempt])

  return <section className="pdf-page" aria-label={`PDF page ${page.pageNumber}`} aria-busy={status === "loading"}
    data-page-number={page.pageNumber} data-rendered={status === "ready"}
    style={{ width: viewport.width, height: viewport.height }}>
    <div ref={hostRef} />
    {status === "loading" && <p className="pdf-page-message" role="status">Rendering page {page.pageNumber}…</p>}
    {status === "error" && <div className="pdf-page-message" role="alert">Couldn’t render page {page.pageNumber}. <button className="underline" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1) }}>Retry page</button></div>}
  </section>
}
