import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeading } from "@/components/layout/PageHeading"
import { useAuth } from "@/hooks/useAuth"
import { toApiError } from "@/utils/apiErrors"

export function AccountPage() {
  const { user, logout, isPending } = useAuth()
  const [error, setError] = useState("")
  return (
    <div className="page-content">
        <PageHeading title="Your account" description="A small space that is entirely yours." />
        <Card className="account-card">
          <CardContent className="space-y-5 pt-6">
            <p className="text-lg">Welcome, <strong>{user?.displayName}</strong>.</p>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted-foreground">Email</dt><dd className="break-words">{user?.email}</dd></div>
              <div><dt className="text-muted-foreground">Role</dt><dd>{user?.role === "ROLE_ADMIN" ? "Administrator" : "Reader"}</dd></div>
            </dl>
            {error && <p role="alert" className="text-sm text-error-foreground">{error}</p>}
            <Button disabled={isPending} onClick={async () => {
              setError("")
              try { await logout() } catch (failure) { setError(toApiError(failure).message) }
            }}>{isPending ? "Signing out…" : "Sign out"}</Button>
          </CardContent>
        </Card>
    </div>
  )
}
