import { apiClient } from "./apiClient"
import type { HealthResponse } from "@/types/health"

export async function fetchBackendHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>("/actuator/health")
  return response.data
}
