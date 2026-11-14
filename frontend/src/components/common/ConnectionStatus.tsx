import { CircleCheck, CircleHelp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBackendHealth } from "@/hooks/useBackendHealth"

export function ConnectionStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useBackendHealth()
  const online = data?.status === "UP" && !isError
  return <footer className="connection-status" aria-label="Live service status">
    <span className={online ? "connection-online" : isError ? "connection-offline" : undefined} role="status">
      {online ? <CircleCheck size={14} aria-hidden="true" /> : <CircleHelp size={14} aria-hidden="true" />}
      {isLoading ? "Checking the live service…" : isError ? "Live service unavailable" : online ? "Live service connected" : `Live service: ${data?.status ?? "unknown"}`}
    </span>
    <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Recheck live service"><RefreshCw size={14} aria-hidden="true" />Recheck</Button>
  </footer>
}
