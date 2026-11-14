import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"
import { PdfPage } from "@/components/reader/PdfPage"
import { Button } from "@/components/ui/button"

export function PdfSpread({ pdf, pageNumbers, zoom, onScale }: {
  pdf: PDFDocumentProxy
  pageNumbers: number[]
  zoom: number | "fit"
  onScale: (scale: number) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const pageKey = pageNumbers.join(",")

  useEffect(() => {
    const viewport = viewportRef.current!
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(entry.contentRect.width) })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    let loaded: PDFPageProxy[] = []
    void Promise.all(pageKey.split(",").map((number) => pdf.getPage(Number(number))))
      .then((result) => {
        loaded = result
        if (active) setPages(result)
        else result.forEach((page) => page.cleanup())
      }).catch(() => { if (active) setError(true) })
    return () => {
      active = false
      loaded.forEach((page) => page.cleanup())
    }
  }, [pdf, pageKey, attempt])

  const totalWidth = pages.reduce((sum, page) => sum + page.getViewport({ scale: 1 }).width, 0)
  const scale = zoom === "fit" ? Math.max(0.05, (width - 32 - (pages.length - 1) * 16) / (totalWidth || 1)) : zoom
  useEffect(() => { if (pages.length && width) onScale(scale) }, [scale, onScale, pages.length, width])
  useEffect(() => { viewportRef.current?.scrollTo({ top: 0, left: 0 }) }, [pageKey])

  return <div ref={viewportRef} className="reader-viewport" tabIndex={0} aria-label="PDF reading area">
    {error ? <div className="reader-message" role="alert"><p>Couldn’t load these pages.</p><Button onClick={() => { setPages([]); setError(false); setAttempt((value) => value + 1) }}>Retry pages</Button></div> :
      !pages.length || !width ? <p className="reader-message" role="status">Preparing pages…</p> :
        <div className="pdf-spread">{pages.map((page) => <PdfPage key={`${page.pageNumber}:${scale}`} page={page} scale={scale} />)}</div>}
  </div>
}
