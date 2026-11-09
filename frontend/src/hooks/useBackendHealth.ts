import { useQuery } from "@tanstack/react-query"
import { fetchBackendHealth } from "@/services/healthService"

export function useBackendHealth() {
  return useQuery({
    queryKey: ["backendHealth"],
    queryFn: fetchBackendHealth,
    refetchInterval: 15000,
  })
}
