import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBackendHealth } from "@/hooks/useBackendHealth"
import { BookOpen, CheckCircle2, RefreshCw, Server, XCircle } from "lucide-react"

export function HomePage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useBackendHealth()

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            OpenShelf
          </h1>
          <p className="text-base text-slate-600 max-w-md mx-auto">
            Digital Library & Social Reading Platform. Discover, upload,
            read, organize, annotate, and share books in a distraction-free
            environment.
          </p>
        </header>

        {/* System Architecture & Status Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-slate-500" />
                <CardTitle className="text-lg">Backend Health Check</CardTitle>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                /actuator/health
              </span>
            </div>
            <CardDescription>
              Real-time connectivity verification between React Vite and Spring
              Boot 4.1 backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Connection Status
              </span>
              <div>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting to backend...</span>
                  </div>
                ) : isError ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                    <XCircle className="w-4 h-4" />
                    <span>Unreachable</span>
                  </div>
                ) : data?.status === "UP" ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Online (Status: UP)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <span>Status: {data?.status ?? "UNKNOWN"}</span>
                  </div>
                )}
              </div>
            </div>

            {isError && (
              <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md">
                Failed to reach Spring Boot API: {(error as Error)?.message || "Unknown error"}.
                Ensure Spring Boot is running on port 8080.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                {isFetching ? "Checking..." : "Re-check Health"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <footer className="text-center text-xs text-slate-400 space-y-1">
          <p>OpenShelf Engineering Initialization & Bootstrap Phase</p>
          <p>Monorepo Layered Architecture • Spring Boot 4.1.2 • React 19 • PostgreSQL 17</p>
        </footer>
      </div>
    </main>
  )
}
