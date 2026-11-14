import { useEffect, type ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AuthContext } from "@/contexts/AuthContext"
import { currentUserKey, useCurrentUser } from "@/hooks/useCurrentUser"
import * as authService from "@/services/authService"
import { clearCsrfToken } from "@/services/apiClient"
import type { User } from "@/types/auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const session = useCurrentUser()

  async function replaceUser(user: User | null) {
    await client.cancelQueries()
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" })
    client.setQueryData(currentUserKey, user)
  }

  const login = useMutation({ mutationFn: authService.login, onSuccess: replaceUser, retry: false })
  const register = useMutation({ mutationFn: authService.register, retry: false })
  const logout = useMutation({ mutationFn: authService.logout, onSuccess: () => replaceUser(null), retry: false })

  useEffect(() => {
    const check = () => { void client.invalidateQueries({ queryKey: currentUserKey }) }
    const expired = () => {
      clearCsrfToken()
      void client.cancelQueries().then(() => {
        client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" })
        client.setQueryData(currentUserKey, null)
      })
    }
    window.addEventListener("openshelf:check-session", check)
    window.addEventListener("openshelf:unauthenticated", expired)
    return () => {
      window.removeEventListener("openshelf:check-session", check)
      window.removeEventListener("openshelf:unauthenticated", expired)
    }
  }, [client])

  const status = session.isPending ? "loading" : session.isError ? "error" : session.data ? "authenticated" : "anonymous"
  return (
    <AuthContext.Provider value={{
      user: session.data, status, error: session.error?.message || null,
      isPending: login.isPending || register.isPending || logout.isPending,
      login: login.mutateAsync, register: register.mutateAsync, logout: logout.mutateAsync,
      retrySession: () => { void session.refetch() },
    }}>
      {children}
    </AuthContext.Provider>
  )
}
