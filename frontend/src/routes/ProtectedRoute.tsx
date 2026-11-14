import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { SessionStatus } from "@/components/common/SessionStatus"

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === "loading" || status === "error") return <SessionStatus />
  if (status === "anonymous") return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return <Outlet />
}
