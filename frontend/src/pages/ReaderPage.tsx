import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Maximize, Minimize } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePdfDocument } from "@/hooks/usePdfDocument"
import { getBook } from "@/services/bookService"
import { getReadingProgress, saveReadingProgress } from "@/services/readingProgressService"
import { PdfSpread } from "@/components/reader/PdfSpread"
import { ReaderToolbar } from "@/components/reader/ReaderToolbar"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clampPage, clampZoom, visiblePages } from "@/utils/reader"
import type { BookDetail } from "@/types/book"
import type { MockProgressResult, ReaderMode } from "@/types/readingProgress"
import "@/styles/reader.css"

export function ReaderPage() {
  const { bookId = "" } = useParams()
  const { user } = useAuth()
  const userId = user!.id
  const query = useQuery({
    queryKey: ["reader", userId, bookId],
    queryFn: async () => {
      const { data: book } = await getBook(bookId)
      const { data: progress } = await getReadingProgress(userId, book.id, book.documentVersion)
      return { book, progress }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  if (!query.data) return <div className="reader-layout">
    <header className="reader-header"><Button asChild variant="ghost"><Link to="/library"><ArrowLeft aria-hidden="true" />My Library</Link></Button><Badge>Reader prototype</Badge></header>
    <main className="reader-message">{query.isError ? <div role="alert"><h1 className="font-serif text-3xl">Book unavailable</h1><p>{query.error.message}</p><Button className="mt-4" onClick={() => { void query.refetch() }}>Try again</Button></div> : <p role="status">Loading sample book…</p>}</main>
  </div>

  return <ReaderSession key={`${userId}:${query.data.book.id}:${query.data.book.documentVersion}`} userId={userId} book={query.data.book} initialProgress={query.data.progress} />
}

function ReaderSession({ userId, book, initialProgress }: { userId: string; book: BookDetail; initialProgress: MockProgressResult }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const { document: pdf, error, loadedPercent } = usePdfDocument(book.pdfUrl, attempt)
  const [page, setPage] = useState(initialProgress.progress?.currentPage ?? 1)
  const [mode, setMode] = useState<ReaderMode>("single")
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches)
  const [zoom, setZoom] = useState<number | "fit">(() => window.matchMedia("(max-width: 767px)").matches ? "fit" : 1)
  const [scale, setScale] = useState(1)
  const [storage, setStorage] = useState(initialProgress.storage)
  const [saveError, setSaveError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [jumpError, setJumpError] = useState<string | null>(null)
  const effectiveMode = narrow ? "single" : mode
  const pages = visiblePages(page, pdf?.numPages ?? 1, effectiveMode)
  const start = pages[0]
  const end = pages[1] ?? start
  const pageCount = pdf?.numPages ?? 0
  const percent = pageCount ? Math.round(start / pageCount * 100) : 0

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const change = () => { setNarrow(media.matches); if (media.matches) setZoom("fit") }
    media.addEventListener("change", change)
    return () => media.removeEventListener("change", change)
  }, [])

  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", change)
    return () => document.removeEventListener("fullscreenchange", change)
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${book.title} · OpenShelf Reader`
    return () => { document.title = previousTitle }
  }, [book.title])

  useEffect(() => {
    if (!pdf) return
    let active = true
    void saveReadingProgress(userId, { bookId: book.id, documentVersion: book.documentVersion, currentPage: start, updatedAt: new Date().toISOString() })
      .then(({ data }) => { if (active) { setStorage(data.storage); setSaveError(false) } })
      .catch(() => { if (active) setSaveError(true) })
    return () => { active = false }
  }, [pdf, start, userId, book.id, book.documentVersion])

  async function toggleFullscreen() {
    setFullscreenError(null)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await rootRef.current?.requestFullscreen()
    } catch { setFullscreenError("Fullscreen is unavailable. You can keep reading in this window.") }
  }

  function navigate(direction: number) {
    setPage(clampPage(start + direction * (effectiveMode === "double" ? 2 : 1), pageCount))
    setJumpError(null)
  }

  return <div className="reader-layout" ref={rootRef} onKeyDown={(event) => {
    if (!pdf || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]"))) return
    if (event.key === "ArrowRight") { event.preventDefault(); navigate(1) }
    if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1) }
  }}>
    <a className="skip-link" href="#reader-content">Skip to PDF</a>
    <header className="reader-header">
      <Button asChild variant="ghost" size="sm"><Link to="/library"><ArrowLeft aria-hidden="true" /><span className="reader-back-label">My Library</span></Link></Button>
      <div className="reader-book-title"><p className="reader-eyebrow">READING SPACE</p><h1>{book.title}</h1><p>{book.author}</p></div>
      <div className="flex items-center"><ThemeToggle /><Button variant="ghost" size="icon" disabled={!document.fullscreenEnabled} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={document.fullscreenEnabled ? "Fullscreen" : "Fullscreen is not supported in this browser"} onClick={() => { void toggleFullscreen() }}>{fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}</Button></div>
    </header>
    <div className="reader-prototype-note"><Badge>{book.source === "private" ? "Private PDF" : "Mock reader"}</Badge><span>{saveError ? "Position could not be saved." : storage === "browser" ? "Position saved in this browser only · no database sync" : "Storage unavailable · position kept in memory until this tab reloads"}</span></div>
    {fullscreenError && <p className="reader-inline-error" role="alert">{fullscreenError}</p>}
    <main id="reader-content" tabIndex={-1} className="reader-main">
      {error ? <div className="reader-message" role="alert"><h2 className="font-serif text-3xl">A small pause.</h2><p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Retry PDF</Button></div> : !pdf ?
        <p className="reader-message" role="status">Loading PDF{loadedPercent === null ? "…" : `… ${loadedPercent}%`}</p> : <>
          <ReaderToolbar mode={effectiveMode} setMode={(value) => { setPage(visiblePages(start, pageCount, value)[0]); setMode(value) }} narrow={narrow} zoom={zoom} scale={scale} setZoom={(value) => setZoom(value === "fit" ? value : clampZoom(value))} />
          <PdfSpread key={pages.join(",")} pdf={pdf} pageNumbers={pages} zoom={zoom} onScale={setScale} />
        </>}
    </main>
    <footer className="reader-footer">
      <div className="reader-pagination">
        <Button variant="outline" size="sm" aria-label="Previous page" disabled={!pdf || start <= 1} onClick={() => navigate(-1)}><ArrowLeft aria-hidden="true" /><span className="reader-nav-label">Previous</span></Button>
        <form className="reader-page-jump" noValidate onSubmit={(event) => {
          event.preventDefault()
          const input = new FormData(event.currentTarget).get("page")
          const target = Number(input)
          if (!Number.isInteger(target) || target < 1 || target > pageCount) { setJumpError(`Choose a page from 1 to ${pageCount}.`); return }
          setPage(target)
          setJumpError(null)
        }}>
          <label htmlFor="reader-page">Page</label>
          <Input key={start} id="reader-page" name="page" type="number" inputMode="numeric" min={1} max={pageCount || 1} defaultValue={start} aria-invalid={!!jumpError} aria-describedby={jumpError ? "reader-jump-error" : undefined} disabled={!pdf} />
          <span className="reader-page-count" aria-live="polite">{end > start ? `–${end} of ${pageCount}` : `of ${pageCount || "…"}`}</span>
          <Button type="submit" variant="ghost" size="sm" disabled={!pdf}>Go</Button>
        </form>
        <Button variant="outline" size="sm" aria-label="Next page" disabled={!pdf || end >= pageCount} onClick={() => navigate(1)}><span className="reader-nav-label">Next</span><ArrowRight aria-hidden="true" /></Button>
      </div>
      {jumpError && <p id="reader-jump-error" role="alert">{jumpError}</p>}
      <div className="reader-progress"><progress value={percent} max={100} aria-label="Reading progress" /><span>{percent}%</span></div>
      <p className="reader-footnote">{book.license}<span className="reader-keyboard-hint"> · Use ← → to turn pages</span></p>
    </footer>
  </div>
}
