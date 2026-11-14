/** Reader-facing contract shared by the demo and real private books. */
export interface BookDetail {
  id: string
  title: string
  author: string
  description: string
  documentVersion: string
  pdfUrl: string
  license: string
  source?: "sample" | "private"
  totalPages?: number
}

export interface PrivateBook {
  id: string
  title: string
  author: string
  description: string
  visibility: "PRIVATE"
  createdAt: string
  updatedAt: string
  file: {
    id: string
    version: number
    originalFilename: string
    contentType: "application/pdf"
    sizeBytes: number
    sha256: string
    pageCount: number
    createdAt: string
  }
}

export interface BookUpload {
  file: File
  title: string
  author: string
  description: string
}

export interface BookPage {
  success: true
  data: PrivateBook[]
  timestamp: string
  pagination: { page: number; size: number; totalElements: number; totalPages: number; isLast: boolean }
}
