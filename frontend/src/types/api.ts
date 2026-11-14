export interface ApiResponse<T> {
  success: true
  data: T
  timestamp: string
}

export interface FieldIssue {
  field: string
  issue: string
}

export interface ApiFailure {
  success: false
  error: { code: string; message: string; status: number; details: FieldIssue[] }
  timestamp: string
}
