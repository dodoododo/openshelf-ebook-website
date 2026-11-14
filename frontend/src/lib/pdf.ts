import { GlobalWorkerOptions } from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

// Vite emits the matching installed worker as a hashed local asset; no CDN/version mismatch.
GlobalWorkerOptions.workerSrc = workerUrl

export { getDocument, TextLayer } from "pdfjs-dist"
