import { Navigate, useNavigate } from "react-router-dom"
import { AuthForm } from "@/components/common/AuthForm"
import { SessionStatus } from "@/components/common/SessionStatus"
import { useAuth } from "@/hooks/useAuth"

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  if (auth.status === "loading" || auth.status === "error") return <SessionStatus />
  if (auth.status === "authenticated") return <Navigate to="/account" replace />
  return <AuthForm registration onSubmit={async (values) => {
    await auth.register(values)
    navigate("/login", { replace: true, state: { registered: true } })
  }} />
}
