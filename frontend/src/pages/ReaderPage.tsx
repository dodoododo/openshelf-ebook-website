import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Maximize, Minimize } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePdfDocument } from "@/hooks/usePdfDocument"
import { getBook } from "@/services/bookService"
import { getPrivateReadingProgress, getReadingProgress, saveReadingProgress } from "@/services/readingProgressService"
import { useReadingProgressSave } from "@/hooks/useReadingProgressSave"
import { PdfSpread } from "@/components/reader/PdfSpread"
import { ReaderToolbar } from "@/components/reader/ReaderToolbar"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clampPage, clampZoom, visiblePages } from "@/utils/reader"
import type { BookDetail } from "@/types/book"
import type { ReaderInitialProgress, ReaderMode } from "@/types/readingProgress"
import "@/styles/reader.css"

export function ReaderPage() {
  const { bookId = "" } = useParams()
  const { user } = useAuth()
  const userId = user!.id
  const query = useQuery({
    queryKey: ["reader", userId, bookId],
    queryFn: async ({ signal }) => {
      const { data: book } = await getBook(bookId)
      signal.throwIfAborted()
      const progress: ReaderInitialProgress = book.source === "private"
        ? { kind: "server", progress: (await getPrivateReadingProgress(book.id, book.documentVersion, signal)).data }
        : { kind: "sample", ...(await getReadingProgress(userId, book.id, book.documentVersion)).data }
      return { book, progress }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  if (!query.data) return <div className="reader-layout">
    <header className="reader-header"><Button asChild variant="ghost"><Link to="/library"><ArrowLeft aria-hidden="true" />My Library</Link></Button><Badge>Reader prototype</Badge></header>
    <main className="reader-message">{query.isError ? <div role="alert"><h1 className="font-serif text-3xl">Book unavailable</h1><p>{query.error.message}</p><Button className="mt-4" onClick={() => { void query.refetch() }}>Try again</Button></div> : <p role="status">Loading book and reading position…</p>}</main>
  </div>

  return <ReaderSession key={`${userId}:${query.data.book.id}:${query.data.book.documentVersion}`} userId={userId} book={query.data.book} initialProgress={query.data.progress} />
}

function ReaderSession({ userId, book, initialProgress }: { userId: string; book: BookDetail; initialProgress: ReaderInitialProgress }) {
  const routerNavigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const { document: pdf, error, loadedPercent } = usePdfDocument(book.pdfUrl, attempt)
  const [page, setPage] = useState(initialProgress.progress?.currentPage ?? 1)
  const [mode, setMode] = useState<ReaderMode>("single")
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches)
  const [zoom, setZoom] = useState<number | "fit">(() => window.matchMedia("(max-width: 767px)").matches ? "fit" : 1)
  const [scale, setScale] = useState(1)
  const [storage, setStorage] = useState(initialProgress.kind === "sample" ? initialProgress.storage : "browser")
  const [saveError, setSaveError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [jumpError, setJumpError] = useState<string | null>(null)
  const effectiveMode = narrow ? "single" : mode
  const pages = visiblePages(page, pdf?.numPages ?? 1, effectiveMode)
  const start = pages[0]
  const end = pages[1] ?? start
  const pageCount = pdf?.numPages ?? 0
  const canonicalPage = clampPage(page, pageCount)
  const percent = pageCount ? Math.round(canonicalPage / pageCount * 100) : 0
  const privateBook = initialProgress.kind === "server"
  const versionMismatch = privateBook && !!pdf && pdf.numPages !== book.totalPages
  const save = useReadingProgressSave({ userId, bookId: book.id, fileId: book.documentVersion,
    initialPage: initialProgress.progress?.currentPage ?? 1,
    confirmedPage: initialProgress.progress?.currentPage ?? null,
    enabled: !!pdf && !versionMismatch, privateBook })
  const [leaving, setLeaving] = useState(false)
  const [leaveFailed, setLeaveFailed] = useState(false)

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
    if (!pdf || initialProgress.kind !== "sample") return
    let active = true
    void saveReadingProgress(userId, { bookId: book.id, documentVersion: book.documentVersion, currentPage: canonicalPage, updatedAt: new Date().toISOString() })
      .then(({ data }) => { if (active) { setStorage(data.storage); setSaveError(false) } })
      .catch(() => { if (active) setSaveError(true) })
    return () => { active = false }
  }, [pdf, canonicalPage, userId, book.id, book.documentVersion, initialProgress.kind])

  async function toggleFullscreen() {
    setFullscreenError(null)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await rootRef.current?.requestFullscreen()
    } catch { setFullscreenError("Fullscreen is unavailable. You can keep reading in this window.") }
  }

  function navigate(direction: number) {
    selectPage(clampPage(start + direction * (effectiveMode === "double" ? 2 : 1), pageCount))
    setJumpError(null)
  }

  function selectPage(target: number) {
    setPage(target)
    if (privateBook) save.setPage(target)
  }

  return <div className="reader-layout" ref={rootRef} onKeyDown={(event) => {
    if (!pdf || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]"))) return
    if (event.key === "ArrowRight") { event.preventDefault(); navigate(1) }
    if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1) }
  }}>
    <a className="skip-link" href="#reader-content">Skip to PDF</a>
    <header className="reader-header">
      <Button asChild variant="ghost" size="sm"><Link to="/library" aria-disabled={leaving} onClick={(event) => {
        if (!privateBook || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        if (leaving) return
        setLeaving(true)
        void save.flush().then((success) => {
          setLeaving(false)
          if (success || !save.hasUnsavedChanges) routerNavigate("/library")
          else setLeaveFailed(true)
        })
      }}><ArrowLeft aria-hidden="true" /><span className="reader-back-label">{leaving ? "Saving…" : "My Library"}</span></Link></Button>
      <div className="reader-book-title"><p className="reader-eyebrow">READING SPACE</p><h1>{book.title}</h1><p>{book.author}</p></div>
      <div className="flex items-center"><ThemeToggle /><Button variant="ghost" size="icon" disabled={!document.fullscreenEnabled} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={document.fullscreenEnabled ? "Fullscreen" : "Fullscreen is not supported in this browser"} onClick={() => { void toggleFullscreen() }}>{fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}</Button></div>
    </header>
    <div className="reader-prototype-note"><Badge>{privateBook ? "Private PDF" : "Mock reader"}</Badge>{privateBook ? <>
      <span role="status" aria-label="Reading save status">{save.status === "saved" ? "Saved · account progress" : save.status === "saving" ? "Saving…" : save.status === "failed" ? "Save failed" : "Unsaved changes"}</span>
      {save.status === "failed" && <Button size="sm" variant="outline" onClick={() => { void save.flush() }}>Retry save</Button>}
    </> : <span>{saveError ? "Position could not be saved." : storage === "browser" ? "Position saved in this browser only · no database sync" : "Storage unavailable · position kept in memory until this tab reloads"}</span>}</div>
    {privateBook && save.error && <p className="reader-inline-error" role="alert">{save.error}</p>}
    {leaveFailed && save.hasUnsavedChanges && <div className="reader-inline-error" role="alert">Your latest position is not saved. Retry saving, or <button className="underline" onClick={() => { save.abandon(); routerNavigate("/library") }}>leave without saving</button>.</div>}
    {fullscreenError && <p className="reader-inline-error" role="alert">{fullscreenError}</p>}
    <main id="reader-content" tabIndex={-1} className="reader-main">
      {versionMismatch ? <div className="reader-message" role="alert">The PDF does not match its page metadata. Reopen the book; progress will not be overwritten.</div> : error ? <div className="reader-message" role="alert"><h2 className="font-serif text-3xl">A small pause.</h2><p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Retry PDF</Button></div> : !pdf ?
        <p className="reader-message" role="status">Loading PDF{loadedPercent === null ? "…" : `… ${loadedPercent}%`}</p> : <>
          <ReaderToolbar mode={effectiveMode} setMode={setMode} narrow={narrow} zoom={zoom} scale={scale} setZoom={(value) => setZoom(value === "fit" ? value : clampZoom(value))} />
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
          selectPage(target)
          setJumpError(null)
        }}>
          <label htmlFor="reader-page">Page</label>
          <Input key={canonicalPage} id="reader-page" name="page" type="number" inputMode="numeric" min={1} max={pageCount || 1} defaultValue={canonicalPage} aria-invalid={!!jumpError} aria-describedby={jumpError ? "reader-jump-error" : undefined} disabled={!pdf} />
          <span className="reader-page-count" aria-live="polite">of {pageCount || "…"}</span>
          {end > start && <span className="text-xs text-muted-foreground" aria-label="Visible spread">(view {start}–{end})</span>}
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
