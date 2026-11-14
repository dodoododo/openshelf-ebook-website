import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { uploadBook } from "@/services/bookService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadMaxBytes, validateBookUpload } from "@/utils/bookValidation"
import type { BookUpload, PrivateBook } from "@/types/book"

export function BookUploadForm({ onUploaded }: { onUploaded: (book: PrivateBook) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [validation, setValidation] = useState<string | null>(null)
  const [percentage, setPercentage] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: (book: BookUpload) => uploadBook(book, setPercentage),
    onSuccess: ({ data }) => onUploaded(data), retry: false,
  })

  return <form className="space-y-4" noValidate onSubmit={(event) => {
    event.preventDefault()
    const error = validateBookUpload({ file, title, author, description })
    setValidation(error)
    if (error || !file) return
    setPercentage(null)
    mutation.mutate({ file, title, author, description })
  }}>
    <p className="text-sm text-muted-foreground">Your PDF stays private to your account. Up to {Math.round(uploadMaxBytes / 1024 / 1024)} MB per file. Encrypted PDFs are not supported.</p>
    <fieldset disabled={mutation.isPending} className="space-y-4">
      <div><label htmlFor="book-file" className="mb-1 block text-sm">PDF file</label><Input id="book-file" type="file" accept=".pdf,application/pdf" onChange={(event) => {
        const selected = event.target.files?.[0] ?? null
        setFile(selected)
        setValidation(null)
        if (selected && !title) setTitle(selected.name.replace(/\.pdf$/i, ""))
      }} />{file && <p className="mt-1 break-all text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}</div>
      <div><label htmlFor="book-title" className="mb-1 block text-sm">Title</label><Input id="book-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} /></div>
      <div><label htmlFor="book-author" className="mb-1 block text-sm">Author</label><Input id="book-author" value={author} maxLength={200} onChange={(event) => setAuthor(event.target.value)} /></div>
      <div><label htmlFor="book-description" className="mb-1 block text-sm">Description (optional)</label><textarea id="book-description" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} /></div>
    </fieldset>
    {(validation || mutation.error) && <p role="alert" className="rounded-md bg-error-surface p-3 text-sm text-error-foreground">{validation || mutation.error?.message}</p>}
    {mutation.isPending && <div role="status"><p className="text-sm">{percentage === null ? "Starting upload…" : percentage < 100 ? `Uploading… ${percentage}%` : "Upload received. Validating PDF…"}</p>{percentage !== null && <progress className="w-full" value={percentage} max={100} aria-label="Upload progress" />}</div>}
    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Uploading…" : "Upload private PDF"}</Button>
  </form>
}
