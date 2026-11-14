import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { BookOpen, Lock, Plus } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { getMyBooks } from "@/services/bookService"
import { PageHeading } from "@/components/layout/PageHeading"
import { BookUploadForm } from "@/components/books/BookUploadForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { PrivateBook } from "@/types/book"

export function LibraryPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [uploaded, setUploaded] = useState<PrivateBook | null>(null)
  const query = useQuery({ queryKey: ["books", "mine", user!.id, page], queryFn: ({ signal }) => getMyBooks(page, signal), retry: false })

  return <div className="page-content">
    <PageHeading title="My Library" description="Your private books, ready when you are."><Badge><Lock size={12} aria-hidden="true" />Private library</Badge></PageHeading>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Button onClick={() => { setUploaded(null); setOpen(true) }}><Plus aria-hidden="true" />Upload PDF</Button>
      <Button asChild variant="ghost"><Link to="/read/sample">Open sample reader</Link></Button>
    </div>
    {uploaded && <p role="status" className="mb-5 rounded-md bg-secondary p-4 text-sm">“{uploaded.title}” uploaded privately. <Link className="underline" to={`/read/${uploaded.id}`}>Read uploaded PDF</Link></p>}
    {query.isPending ? <p role="status">Loading your books…</p> : query.isError ? <div role="alert" className="rounded-lg border border-border p-6"><p>{query.error.message}</p><Button className="mt-3" variant="outline" onClick={() => { void query.refetch() }}>Retry library</Button></div> : query.data.data.length === 0 ? <Card><CardContent className="py-12 text-center"><BookOpen className="mx-auto mb-4" size={36} aria-hidden="true" /><h2 className="font-serif text-3xl">A shelf of your own.</h2><p className="mt-2 text-muted-foreground">Upload your first PDF to start reading. Only your account can access it.</p></CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">{query.data.data.map((book) => <Card key={book.id}><CardContent className="flex h-full flex-col gap-3 pt-6">
        <Badge>Private · PDF</Badge><h2 className="break-words font-serif text-2xl">{book.title}</h2><p className="break-words text-sm text-muted-foreground">{book.author}</p>
        {book.description && <p className="line-clamp-3 break-words text-sm">{book.description}</p>}
        <p className="text-xs text-muted-foreground">{book.file.pageCount} pages · {(book.file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
        <Button asChild variant="outline" className="mt-auto"><Link to={`/read/${book.id}`} aria-label={`Read ${book.title}`}><BookOpen aria-hidden="true" />Read</Link></Button>
      </CardContent></Card>)}</div>
      <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Library pages"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">Page {page + 1} of {query.data.pagination.totalPages}</span><Button variant="outline" disabled={query.data.pagination.isLast} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>
    </>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogTitle className="mb-2 pr-10 font-serif text-3xl">Add a private PDF</DialogTitle><DialogDescription className="mb-5 text-sm text-muted-foreground">Upload a book to your personal library.</DialogDescription>
      <BookUploadForm onUploaded={(book) => {
        setUploaded(book); setOpen(false); setPage(0)
        void client.invalidateQueries({ queryKey: ["books", "mine", user!.id] })
      }} />
    </DialogContent></Dialog>
  </div>
}
