import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { BookOpen } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { getContinueReading } from "@/services/readingProgressService"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ContinueReadingSection({ standalone = false }: { standalone?: boolean }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const query = useQuery({ queryKey: ["continue-reading", user!.id, page], queryFn: ({ signal }) => getContinueReading(page, signal), retry: false })

  return <section className="mb-10" aria-labelledby="continue-reading-heading">
    <h2 id="continue-reading-heading" className="mb-4 font-serif text-3xl">{standalone ? "Your recent books" : "Continue Reading"}</h2>
    {query.isPending ? <div role="status"><p className="mb-3 text-sm text-muted-foreground">Loading reading progress…</p><div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((key) => <Card key={key}><CardContent className="space-y-4 py-6 motion-safe:animate-pulse"><div className="h-6 w-2/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /><div className="h-16 rounded bg-muted" /></CardContent></Card>)}</div></div> : query.isError ?
      <div role="alert" className="rounded-lg border border-border p-5"><p>{query.error.message}</p><Button variant="outline" className="mt-3" onClick={() => { void query.refetch() }}>Retry reading progress</Button></div> : query.data.data.length === 0 ?
        <div className="rounded-lg border border-dashed border-border p-6"><p className="font-medium">Your next chapter starts here.</p><p className="mt-1 text-sm text-muted-foreground">Open a private PDF to begin. Your saved reading positions will appear here.</p></div> : <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">{query.data.data.map(({ book, progress }) => <Card key={progress.bookFileId}><CardContent className="flex h-full flex-col gap-3 pt-6">
            <div className="flex items-start gap-3"><div className="flex size-14 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground" aria-hidden="true"><BookOpen size={26} strokeWidth={1.3} /></div><div className="min-w-0"><h3 className="break-words font-serif text-2xl">{book.title}</h3><p className="break-words text-sm text-muted-foreground">{book.author}</p></div></div>
            <p className="text-sm">Page {progress.currentPage} of {progress.totalPages} · {progress.progressPercentage}%</p>
            <progress className="h-1 w-full accent-primary" value={progress.progressPercentage} max={100} aria-label={`Reading progress for ${book.title}`} />
            <p className="text-xs text-muted-foreground">Last read <time dateTime={progress.lastReadAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(progress.lastReadAt))}</time> · PDF v{progress.fileVersion}</p>
            <Button asChild variant="outline" className="mt-auto"><Link to={`/read/${book.id}`} aria-label={`Resume ${book.title}`}>Resume Reading</Link></Button>
          </CardContent></Card>)}</div>
          <nav aria-label="Continue Reading pages" className="mt-5 flex items-center justify-center gap-4"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">Page {page + 1} of {query.data.pagination.totalPages}</span><Button variant="outline" disabled={query.data.pagination.isLast} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>
        </>}
  </section>
}
