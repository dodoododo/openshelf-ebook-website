import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { AuthForm } from "@/components/common/AuthForm"
import { SessionStatus } from "@/components/common/SessionStatus"
import { useAuth } from "@/hooks/useAuth"
import { safeReturnTo } from "@/utils/authValidation"

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { from?: unknown; registered?: boolean } | null
  const destination = safeReturnTo(state?.from)
  if (auth.status === "loading" || auth.status === "error") return <SessionStatus />
  if (auth.status === "authenticated") return <Navigate to={destination} replace />
  return <AuthForm notice={state?.registered ? "Account created. Sign in with your email and password." : undefined}
    onSubmit={async ({ email, password }) => {
      await auth.login({ email, password })
      navigate(destination, { replace: true })
    }} />
}
