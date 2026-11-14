import { useEffect, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { getDocument } from "@/lib/pdf"

export function usePdfDocument(url: string, attempt: number) {
  const key = `${url}:${attempt}`
  const [state, setState] = useState<{ key: string; document: PDFDocumentProxy | null; error: string | null; loadedPercent: number | null }>({ key, document: null, error: null, loadedPercent: null })

  useEffect(() => {
    let active = true
    const task = getDocument({ url, withCredentials: true })
    task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (active && total > 0) setState((previous) => ({
        key, document: previous.key === key ? previous.document : null, error: null,
        loadedPercent: Math.min(100, Math.round(loaded / total * 100)),
      }))
    }
    void task.promise.then((pdf) => {
      if (active) setState({ key, document: pdf, error: null, loadedPercent: 100 })
    }).catch((failure: unknown) => {
      if (active && failure && typeof failure === "object" && "status" in failure && failure.status === 401) {
        window.dispatchEvent(new Event("openshelf:unauthenticated"))
      }
      if (active) setState({ key, document: null, error: "We couldn’t open this PDF. It may be unavailable, damaged, or password protected.", loadedPercent: null })
    })
    return () => {
      active = false
      // Destroys pending network work, worker, document cache, and page resources.
      void task.destroy().catch(() => {})
    }
  }, [url, attempt, key])

  return state.key === key ? state : { document: null, error: null, loadedPercent: null }
}
