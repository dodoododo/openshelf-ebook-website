import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export function SessionStatus() {
  const { status, error, retrySession } = useAuth()
  return (
    <section className="session-status">
      <div className="max-w-md text-center space-y-4" role="status" aria-live="polite">
        {status === "error" ? <>
          <h1 className="text-xl font-semibold">We could not check your session</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={retrySession}>Try again</Button>
        </> : <p>Checking your session…</p>}
      </div>
    </section>
  )
}
