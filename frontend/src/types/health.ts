export interface HealthResponse {
  status: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN"
  components?: Record<string, { status: string; details?: Record<string, unknown> }>
}
